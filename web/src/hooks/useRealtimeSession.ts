import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { apiClient } from '../api/client';
import type { ChatMessage } from '../types';

interface RealtimeSessionOptions {
  onTokenExpired?: () => void;
  onError?: (err: any) => void;
}

export function useRealtimeSession(options?: RealtimeSessionOptions) {
  // Use targeted selectors to prevent component re-renders when unneeded store values update
  const setIsMicActive = useChatStore(state => state.setIsMicActive);
  const setDuplexPhase = useChatStore(state => state.setDuplexPhase);
  const setVoiceSessionId = useChatStore(state => state.setVoiceSessionId);
  const addMessage = useChatStore(state => state.addMessage);
  const updateLastMessage = useChatStore(state => state.updateLastMessage);
  const setFSMState = useChatStore(state => state.setFSMState);

  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [transcript, setTranscript] = useState({ user: '', assistant: '' });

  // Refs for WebRTC and Audio objects
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  
  // Backchanneling / Barge-in timing state
  const interruptTimerRef = useRef<NodeJS.Timeout | null>(null);

  const reconnectAttemptRef = useRef(0);
  const isConnectingRef = useRef(false);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化 AudioContext (需在用户交互事件中调用)
  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new window.AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const cleanup = useCallback(() => {
    if (interruptTimerRef.current) clearTimeout(interruptTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
    
    // 断开旧连接（但不销毁 localStreamRef 保护 AEC）
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    setIsMicActive(false);
    setDuplexPhase('idle');
  }, [setIsMicActive, setDuplexPhase]);

  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    reconnectAttemptRef.current = 0;
    cleanup();
    setStatus('idle');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (filterNodeRef.current) {
       filterNodeRef.current.disconnect();
       filterNodeRef.current = null;
    }
    if (gainNodeRef.current) {
       gainNodeRef.current.disconnect();
       gainNodeRef.current = null;
    }
    setVoiceSessionId(null);
  }, [cleanup, setVoiceSessionId]);

  // Unmount cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const connect = useCallback(async (isRetry = false) => {
    if (isConnectingRef.current && !isRetry) return;
    
    try {
      isConnectingRef.current = true;
      setStatus('connecting');
      initAudioContext();

      // 1. 获取 Token
      const tokenRes: any = await apiClient('/voice/token', { method: 'POST', body: JSON.stringify({}) });
      const { client_secret: { value: ephemeralKey }, session_id } = tokenRes;
      setVoiceSessionId(session_id);

      // 2. 复用或获取本地流 (保护 AEC)
      if (!localStreamRef.current) {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: { echoCancellation: true, noiseSuppression: true } 
        });
      }

      // Cleanup existing peer connection & datachannel if retrying
      if (dcRef.current) {
         dcRef.current.close();
         dcRef.current = null;
      }
      if (pcRef.current) {
         pcRef.current.close();
      }

      // 3. 建立 RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 创建一个 audio element 用于播放
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;

      // 4. 接管远端流 (通过 Web Audio API 实现滤波和防抖)
      pc.ontrack = e => {
        if (!audioCtxRef.current) return;
        
        // Cleanup old nodes to prevent audio garbage accumulation
        if (filterNodeRef.current) filterNodeRef.current.disconnect();
        if (gainNodeRef.current) gainNodeRef.current.disconnect();

        const source = audioCtxRef.current.createMediaStreamSource(e.streams[0]);
        const filter = audioCtxRef.current.createBiquadFilter();
        const gain = audioCtxRef.current.createGain();

        filter.type = 'allpass';
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtxRef.current.destination);

        filterNodeRef.current = filter;
        gainNodeRef.current = gain;
      };

      // 添加本地轨道
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // 5. 创建 Data Channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('message', async (e) => {
        const event = JSON.parse(e.data);
        handleDataChannelEvent(event);
      });

      // 6. SDP 握手
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-realtime-preview";
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        },
      });

      if (!sdpResponse.ok) throw new Error('SDP exchange failed');
      const answerSdp = await sdpResponse.text();
      const answer = { type: 'answer' as RTCSdpType, sdp: answerSdp };
      await pc.setRemoteDescription(answer);

      setIsMicActive(true);
      setStatus('connected');
      isConnectingRef.current = false;
      reconnectAttemptRef.current = 0; // Reset on success

    } catch (err) {
      console.error('Voice Connection Error:', err);
      
      // Exponential Backoff
      if (reconnectAttemptRef.current < 3) {
        const backoffMs = Math.pow(2, reconnectAttemptRef.current) * 1000;
        reconnectAttemptRef.current++;
        console.log(`Retrying voice connection in ${backoffMs}ms... (Attempt ${reconnectAttemptRef.current})`);
        
        setStatus('connecting');
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => connect(true), backoffMs);
        return;
      }

      isConnectingRef.current = false;
      setStatus('error');
      disconnect();
      if (options?.onError) options.onError(err);
    }
  }, [disconnect, initAudioContext, options, setIsMicActive, setVoiceSessionId]);

  // Data Channel 核心事件处理
  const handleDataChannelEvent = useCallback(async (event: any) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        // 检测到用户可能在说话 (Backchanneling / Barge-in)
        setDuplexPhase('listening');
        if (gainNodeRef.current && filterNodeRef.current && audioCtxRef.current) {
          const t = audioCtxRef.current.currentTime;
          // 变“沉闷”
          filterNodeRef.current.type = 'lowpass';
          filterNodeRef.current.frequency.setTargetAtTime(800, t, 0.1);
          // 音量稍微压低
          gainNodeRef.current.gain.setTargetAtTime(0.4, t, 0.1);
          
          // 开启 500ms 观察窗
          if (interruptTimerRef.current) clearTimeout(interruptTimerRef.current);
          interruptTimerRef.current = setTimeout(() => {
            // 超过 500ms 仍在说话，确认为真实打断
            interrupt();
          }, 500);
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        // 用户说话停止 (可能是语气词结束)
        setDuplexPhase('thinking');
        if (interruptTimerRef.current) {
          clearTimeout(interruptTimerRef.current); // 取消打断判定
          interruptTimerRef.current = null;
          
          // 恢复音量和音质
          if (gainNodeRef.current && filterNodeRef.current && audioCtxRef.current) {
            const t = audioCtxRef.current.currentTime;
            filterNodeRef.current.type = 'allpass';
            gainNodeRef.current.gain.setTargetAtTime(1.0, t, 0.1);
          }
        }
        
        // 触发 RAG 检索 (因为我们关闭了 create_response，需要手动触发)
        triggerRAGAndResponse();
        break;

      case 'response.created':
        setDuplexPhase('speaking');
        break;

      case 'response.audio_transcript.delta':
        setTranscript(prev => ({ ...prev, assistant: prev.assistant + event.delta }));
        break;

      case 'response.audio_transcript.done':
        addMessage({ role: 'assistant', content: event.transcript } as any);
        setTranscript(prev => ({ ...prev, assistant: '' }));
        break;

      case 'response.function_call_arguments.done':
        await handleFunctionCall(event);
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
         setTranscript(prev => ({ ...prev, user: event.transcript }));
         addMessage({ role: 'user', content: event.transcript } as any);
         // 一旦确认转写，立即清理临时显示
         if (transcriptTimerRef.current) clearTimeout(transcriptTimerRef.current);
         transcriptTimerRef.current = setTimeout(() => setTranscript(prev => ({ ...prev, user: '' })), 2000);
         break;
    }
  }, [addMessage, setDuplexPhase]);

  // 手动触发 RAG 逻辑
  const triggerRAGAndResponse = useCallback(async () => {
    // 这里是一个极简实现，实际应结合最近的 user transcript。
    // 如果没有 RAG，直接要求生成。
    if (!dcRef.current) return;
    
    const event = {
      type: 'response.create',
      response: {
        modalities: ['audio', 'text']
      }
    };
    dcRef.current.send(JSON.stringify(event));
  }, []);

  // 打断操作 (Barge-in)
  const interrupt = useCallback(() => {
    if (dcRef.current && gainNodeRef.current && audioCtxRef.current) {
      const t = audioCtxRef.current.currentTime;
      // 指数级淡出防爆音
      gainNodeRef.current.gain.setTargetAtTime(0, t, 0.05);
      
      dcRef.current.send(JSON.stringify({ type: 'response.cancel' }));
      dcRef.current.send(JSON.stringify({ type: 'conversation.item.truncate' }));
    }
  }, []);

  // 工具调用拦截
  const handleFunctionCall = async (event: any) => {
    if (!dcRef.current) return;
    const { call_id, name, arguments: argsString } = event;
    const args = JSON.parse(argsString || '{}');

    console.log(`[Function Call] ${name}`, args);

    if (name === 'report_state') {
      setFSMState(args.stage);
      dcRef.current.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify({ success: true, noted: args.stage })
        }
      }));
      // FIX: trigger response after tool call to avoid silence
      triggerRAGAndResponse();
    } else if (name === 'search_knowledge_base') {
      try {
        const res: any = await apiClient('/voice/rag/query', { method: 'POST', body: JSON.stringify({ query: args.query }) });
        const context = res.context;
        
        // 尾部追加注入保护 Cache
        dcRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id,
            output: context
          }
        }));
      } catch (e) {
         dcRef.current.send(JSON.stringify({
            type: 'conversation.item.create',
            item: { type: 'function_call_output', call_id, output: "查询失败" }
         }));
      }
      // FIX: trigger response after tool call to avoid silence
      triggerRAGAndResponse();
    } else if (name === 'escalate_crisis') {
       // 触发危机干预 UI
       dcRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id, output: "已上报系统。" }
       }));
       interrupt();
       disconnect();
    } else if (name === 'save_user_info') {
       dcRef.current.send(JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id, output: "Saved." }
       }));
       triggerRAGAndResponse();
    }
  };

  return {
    status,
    transcript,
    connect,
    disconnect,
    interrupt
  };
}
