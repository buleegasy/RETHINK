import { useState, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage, SSEChunk, FSMState, UserProfile, TechChain } from '../types';
import { chatApi } from '../api/chat';

export function useChat() {
  const [error, setError] = useState<string | null>(null);
  
  const addMessage = useChatStore(state => state.addMessage);
  const updateLastMessage = useChatStore(state => state.updateLastMessage);
  const setStage = useChatStore(state => state.setStage);
  const setFSMState = useChatStore(state => state.setFSMState);
  const setIsStreaming = useChatStore(state => state.setIsStreaming);
  const setSessionId = useChatStore(state => state.setSessionId);

  const sendMessage = useCallback(async (
    text: string, 
    profile?: UserProfile, 
    facialEmotion?: { label: string; labelZh: string; confidence: number },
    options?: { isHidden?: boolean }
  ) => {
    // Concurrency guard: return immediately if already streaming
    if (useChatStore.getState().isStreaming) {
      return;
    }

    if (!text.trim() && !profile) return;

    // 离线安全检查
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('当前处于离线状态，请检查网络连接后重试');
      return;
    }

    setError(null);
    setIsStreaming(true);

    const { messages, sessionId, selectedModel } = useChatStore.getState();

    // 添加用户消息
    const userMsg: ChatMessage = { 
      role: 'user', 
      content: text.trim() || '(开启我的专属疗愈空间)',
      isHidden: options?.isHidden 
    };
    addMessage(userMsg);

    // 预先添加一条空的 assistant 消息用于流式填充
    addMessage({ role: 'assistant', content: '' });

    let hasReceivedData = false;

    try {
      // 准备请求体
      const payloadMessages = [...messages, userMsg].map(({ id, role, content }) => ({ id, role, content }));

      const streamBody = await chatApi.sendMessageStream({
        messages: payloadMessages,
        sessionId: sessionId || undefined,
        profile,
        model: selectedModel,
        facialEmotion,
      });

      const reader = streamBody.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      let buffer = '';

      const processLine = (line: string) => {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6).trim();
          if (!dataStr) return;
          
          try {
            const parsed: SSEChunk = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            
            // 更新文字
            if (parsed.delta) {
              hasReceivedData = true;
              updateLastMessage(parsed.delta);
            }
            // 更新 CBT 阶段（向后兼容）
            if (parsed.stage) {
              setStage(parsed.stage);
            }
            // 更新 FSM 状态
            if (parsed.fsmState) {
              setFSMState(parsed.fsmState as FSMState);
              if (parsed.fsmState === 'Crisis_Escalation') {
                done = true;
                reader.cancel().catch(e => console.warn(e));
              }
            }
            // 更新 UI 控制参数
            if (parsed.uiControl) {
              useChatStore.getState().setUIControl(parsed.uiControl);
            }
            // 更新破冰层级
            if (parsed.icebreakerLayer) {
              useChatStore.getState().setIcebreakerLayer(parsed.icebreakerLayer);
            }
            // 存储后端返回的 sessionId
            const currentSessionId = useChatStore.getState().sessionId;
            if (parsed.sessionId && !currentSessionId) {
              setSessionId(parsed.sessionId);
            }


            // 当收到最终块时，存储技术链元数据（含 FSM 信息）
            if (parsed.done && (parsed.intent || parsed.model)) {
              const techChain: TechChain = {
                intent: (parsed.intent === 'casual' || parsed.intent === 'emotional' || parsed.intent === 'crisis' || parsed.intent === 'ambiguous')
                  ? parsed.intent
                  : 'ambiguous',
                ragRetrievalMode: parsed.ragRetrievalMode,
                riskLevel: parsed.riskLevel,
                riskReason: parsed.riskReason,
                ragQueried: parsed.ragQueried,
                ragQuery: parsed.ragQuery,
                ragDecisionReason: parsed.ragDecisionReason,
                ragChunks: parsed.ragChunks || 0,
                ragSources: parsed.ragSources || [],
                ragScores: parsed.ragScores || [],
                ragSnippets: parsed.ragSnippets || [],
                retrievedEvidence: parsed.retrieved_evidence,
                reasoningDeduction: parsed.reasoning_deduction,
                intentConfidence: parsed.intentConfidence,
                intentTriggers: parsed.intentTriggers || [],
                intentEmotion: parsed.intentEmotion,
                model: parsed.model || 'unknown',
                fsmState: parsed.fsmState,
                fsmTrigger: parsed.fsmTrigger,
              };
              useChatStore.getState().setLastMessageTechChain(techChain);
            }
          } catch (e) {
            // 忽略非 JSON 数据行
            console.warn('Failed to parse SSE data:', dataStr, e);
          }
        }
      };

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          // SSE 格式解析 (data: {...}\n\n)
          const lines = buffer.split('\n');
          // 最后一个元素可能是未结束的行（没有遇到 \n），将其保留在 buffer 中，等下一个 chunk 拼接
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            processLine(line);
          }
        }
      }

      // Fix boundary case: if the HTTP stream ends without a final trailing \n, parse the remaining content in buffer
      if (buffer.startsWith('data: ')) {
        processLine(buffer);
      }

    } catch (err) {
      console.error('Chat error:', err);
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      const errorMessage = isOffline 
        ? '当前处于离线状态，请检查网络连接后重试' 
        : (err instanceof Error ? err.message : '发送失败，请检查网络连接');

      setError(errorMessage);
      if (!hasReceivedData) {
        useChatStore.getState().removeLastMessage();
      } else {
        updateLastMessage(isOffline 
          ? '\n\n*(网络连接已中断，当前处于离线状态)*' 
          : '\n\n*(抱歉，网络连接中断或服务出现异常，请稍后再试)*'
        );
      }
    } finally {
      setIsStreaming(false);
    }
  }, [addMessage, updateLastMessage, setStage, setFSMState, setIsStreaming, setSessionId]);

  return { sendMessage, error };
}
