import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage, SSEChunk, FSMState, UserProfile } from '../types';

export function useChat() {
  const [error, setError] = useState<string | null>(null);
  
  const {
    sessionId,
    messages,
    addMessage,
    updateLastMessage,
    setStage,
    setFSMState,
    setIsStreaming,
    setSessionId,
    selectedModel,
    token,
  } = useChatStore();

  const sendMessage = async (
    text: string, 
    profile?: UserProfile, 
    facialEmotion?: { label: string; labelZh: string; confidence: number },
    options?: { isHidden?: boolean }
  ) => {
    if (!text.trim() && !profile) return;

    setError(null);
    setIsStreaming(true);

    // 添加用户消息
    const userMsg: ChatMessage = { 
      role: 'user', 
      content: text.trim() || '(开启我的专属疗愈空间)',
      isHidden: options?.isHidden 
    };
    addMessage(userMsg);

    // 预先添加一条空的 assistant 消息用于流式填充
    addMessage({ role: 'assistant', content: '' });

    try {
      // 准备请求体
      const payloadMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messages: payloadMessages,
          stream: true,
          sessionId: sessionId || undefined,
          profile,
          model: selectedModel,
          ...(facialEmotion ? { facialEmotion } : {}),
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          useChatStore.getState().logout();
          throw new Error('登录凭证已过期，请重新登录');
        }
        throw new Error(`API Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunkString = decoder.decode(value, { stream: true });
          // SSE 格式解析 (data: {...}\n\n)
          const lines = chunkString.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;
              
              try {
                const parsed: SSEChunk = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                
                // 更新文字
                if (parsed.delta) {
                  updateLastMessage(parsed.delta);
                }
                // 更新 CBT 阶段（向后兼容）
                if (parsed.stage) {
                  setStage(parsed.stage);
                }
                // 更新 FSM 状态
                if (parsed.fsmState) {
                  setFSMState(parsed.fsmState as FSMState);
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
                if (parsed.sessionId && !sessionId) {
                  setSessionId(parsed.sessionId);
                }
                
                // 当收到最终块时，存储技术链元数据（含 FSM 信息）
                if (parsed.done && (parsed.intent || parsed.model)) {
                  const techChain = {
                    intent: parsed.intent || 'ambiguous',
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
                  useChatStore.getState().setLastMessageTechChain(techChain as any);
                }
              } catch (e) {
                // 忽略非 JSON 数据行
                console.warn('Failed to parse SSE data:', dataStr, e);
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || '发送失败，请重试');
      updateLastMessage('\n\n*(抱歉，网络连接或服务出现了问题，请稍后再试)*');
    } finally {
      setIsStreaming(false);
    }
  };

  return { sendMessage, error };
}
