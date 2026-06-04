import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getLLMClient, getModelName, buildSystemPromptFSM } from '../lib/llm';
import { detectStage, stageToIndex } from '../lib/cbt-stages';
import { classifyIntent } from '../lib/intent-router';
import { retrieveContext } from '../lib/rag';
import {
  transition,
  applyTransition,
  createDefaultContext,
  type FSMContext,
  type FSMState,
} from '../lib/fsm';
import type { Env, ChatRequest, ChatMessage, SessionRow } from '../types';

export const chatRouter = new Hono<{ Bindings: Env }>();

chatRouter.post('/', async (c) => {
  const body = await c.req.json<ChatRequest>();
  const { messages, stream = true, sessionId = crypto.randomUUID(), profile, facialEmotion, model: requestedModel } = body;

  if (!messages || messages.length === 0) {
    return c.json({ error: 'messages cannot be empty' }, 400);
  }

  // ── 1. 从 D1 获取历史会话 + FSM 状态 ──
  let currentStageIndex = 0;
  let fsmCtx: FSMContext = createDefaultContext();

  try {
    const session = await c.env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
      .bind(sessionId)
      .first<SessionRow>();

    if (session) {
      currentStageIndex = session.current_stage - 1;
      // 恢复 FSM 上下文
      if (session.fsm_state) {
        fsmCtx.currentState = session.fsm_state as FSMState;
      }
      if (session.fsm_context) {
        try {
          const parsed = JSON.parse(session.fsm_context);
          fsmCtx = { ...fsmCtx, ...parsed, currentState: fsmCtx.currentState };
        } catch {
          console.warn('Failed to parse FSM context JSON, using defaults');
        }
      }
    }
  } catch (e) {
    console.warn('D1 Database read skipped/failed, proceeding without history', e);
  }

  // ── 1.1 处理传入的 Profile (Onboarding Cards) ──
  if (profile) {
    fsmCtx.profileCollected = true;
  }

  // ── 2. 意图路由（代码层面） ──
  const userLastMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
  const intentResult = classifyIntent(userLastMessage);

  console.log(`[Intent Router] type=${intentResult.type}, confidence=${intentResult.confidence}, triggers=${intentResult.triggers.join(',')}`);

  // ── 3. FSM Pre-response 转移 ──
  // 增加 turnCount（用户发了一条消息）
  fsmCtx.turnCount += 1;

  const preTransition = transition(fsmCtx, intentResult, 'pre');
  fsmCtx = applyTransition(fsmCtx, preTransition);

  console.log(`[FSM] pre-transition: ${preTransition.trigger} → state=${fsmCtx.currentState}`);

  // ── 4. RAG 检索（仅 CBT_Stripping 和 Socratic_Questioning 状态触发） ──
  let ragContext = undefined;
  if (
    fsmCtx.currentState === 'CBT_Stripping' ||
    fsmCtx.currentState === 'Socratic_Questioning'
  ) {
    try {
      ragContext = await retrieveContext(c.env, userLastMessage, 5, 0.5);
      console.log(`[RAG] Retrieved ${ragContext.chunks.length} chunks for ${fsmCtx.currentState}`);
    } catch (e) {
      console.warn('[RAG] Retrieval failed, proceeding without knowledge context:', e);
    }
  }

  // ── 5. 构建 System Prompt（基于 FSM 状态） ──
  const systemPrompt = buildSystemPromptFSM(fsmCtx.currentState, ragContext, profile, facialEmotion);

  const client = getLLMClient(c.env);
  const model = getModelName(c.env, requestedModel);

  // 准备 RAG 元数据
  const ragMeta = {
    ragChunks: ragContext?.chunks?.length || 0,
    ragSources: ragContext?.sourceDocuments || [],
    ragScores: ragContext?.scores?.map(s => Math.round(s * 100) / 100) || [],
    model,
  };

  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  // ── 6. 非流式响应 ──
  if (!stream) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: fullMessages,
        stream: false,
        temperature: 0.6,
      });

      const responseText = response.choices[0]?.message?.content || '';
      const stage = detectStage(responseText, currentStageIndex);

      // FSM Post-response 转移
      fsmCtx.turnCount += 1; // AI 回复也计入 turnCount
      const postTransition = transition(fsmCtx, intentResult, 'post', responseText);
      fsmCtx = applyTransition(fsmCtx, postTransition);

      console.log(`[FSM] post-transition: ${postTransition.trigger} → state=${fsmCtx.currentState}`);

      // 保存回 D1
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: responseText }];
      await saveToD1(c.env.DB, sessionId, updatedMessages, stageToIndex(stage) + 1, fsmCtx);

      return c.json({
        content: responseText,
        stage,
        sessionId,
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        fsmTrigger: postTransition.trigger,
        ...ragMeta,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // ── 7. SSE 流式响应 ──
  return streamSSE(c, async (streamEvent) => {
    try {
      const completionStream = await client.chat.completions.create({
        model: model,
        messages: fullMessages,
        stream: true,
        temperature: 0.6,
      });

      let fullResponse = '';
      let extractedReply = '';
      let isExtracting = false;
      let hasFinishedExtraction = false;

      // 辅助函数：寻找第一个非转义的引号
      const getUnescapedQuoteIndex = (str: string): number => {
        let isEscaped = false;
        for (let i = 0; i < str.length; i++) {
          if (str[i] === '\\') {
            isEscaped = !isEscaped;
          } else if (str[i] === '"' && !isEscaped) {
            return i;
          } else {
            isEscaped = false;
          }
        }
        return -1;
      };

      for await (const chunk of completionStream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;

          if (hasFinishedExtraction) {
            continue; // 已经提取完 agent_reply，后续的 JSON 内容不再发送给前端
          }

          if (!isExtracting) {
            const marker = '"agent_reply": "';
            const markerIndex = fullResponse.indexOf(marker);
            
            // 兼容有些模型可能会输出带有空格的情况，比如 "agent_reply":  "
            // 但为了简单和性能，我们还是用正则匹配开始位置
            const match = fullResponse.match(/"agent_reply"\s*:\s*"/);
            
            if (match && match.index !== undefined) {
              isExtracting = true;
              const startContent = fullResponse.substring(match.index + match[0].length);
              
              // 检查这个 initial chunk 里是否就已经包含了结束的引号
              const endIdx = getUnescapedQuoteIndex(startContent);
              
              let cleanContent = startContent;
              if (endIdx !== -1) {
                cleanContent = startContent.substring(0, endIdx);
                hasFinishedExtraction = true;
              }
              
              extractedReply = cleanContent;
              
              if (cleanContent) {
                await streamEvent.writeSSE({
                  data: JSON.stringify({
                    delta: cleanContent,
                    stage: detectStage(cleanContent, currentStageIndex),
                    done: false,
                    sessionId,
                    intent: intentResult.type,
                    fsmState: fsmCtx.currentState,
                    ...ragMeta,
                  })
                });
              }
            }
          } else {
            // 已经在提取中了，检查本次加上 delta 后是否出现结束引号
            // 需要注意的是，前一个 chunk 的最后一个字符可能是转义符，所以要在拼接后的全量提取串中寻找
            
            // 获取从 agent_reply 值开始的所有内容
            const match = fullResponse.match(/"agent_reply"\s*:\s*"/);
            if (match && match.index !== undefined) {
              const startContent = fullResponse.substring(match.index + match[0].length);
              const endIdx = getUnescapedQuoteIndex(startContent);
              
              let cleanDelta = delta;
              if (endIdx !== -1) {
                // 找到了结束点！
                const correctFullReply = startContent.substring(0, endIdx);
                // 那么本次应该发送的 delta 就是 正确的完整回复 减去 已经发送的部分
                cleanDelta = correctFullReply.substring(extractedReply.length);
                hasFinishedExtraction = true;
                extractedReply = correctFullReply;
              } else {
                extractedReply += delta;
              }

              if (cleanDelta) {
                await streamEvent.writeSSE({
                  data: JSON.stringify({
                    delta: cleanDelta,
                    stage: detectStage(extractedReply, currentStageIndex),
                    done: false,
                    sessionId,
                    intent: intentResult.type,
                    fsmState: fsmCtx.currentState,
                    ...ragMeta,
                  })
                });
              }
            }
          }
        }
      }

      // ── 流结束：尝试解析完整 JSON ──
      let uiControl = undefined;
      let finalReply = extractedReply;
      
      try {
        const parsed = JSON.parse(fullResponse.trim());
        if (parsed.ui_control) uiControl = parsed.ui_control;
        if (parsed.agent_reply) finalReply = parsed.agent_reply;
      } catch (e) {
        console.warn('Failed to parse final JSON from AI:', e);
      }

      // ── FSM Post-response 转移 ──
      fsmCtx.turnCount += 1;
      const postTransition = transition(fsmCtx, intentResult, 'post', finalReply);
      fsmCtx = applyTransition(fsmCtx, postTransition);

      console.log(`[FSM] post-transition: ${postTransition.trigger} → state=${fsmCtx.currentState}`);

      // 计算最终 CBT 阶段（向后兼容）
      const finalStage = detectStage(finalReply, currentStageIndex);
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: finalReply }];
      await saveToD1(c.env.DB, sessionId, updatedMessages, stageToIndex(finalStage) + 1, fsmCtx);

      // 发送结束标志（含 FSM 状态转移信息 + UI 控制参数）
      await streamEvent.writeSSE({
        data: JSON.stringify({
          delta: '',
          stage: finalStage,
          done: true,
          sessionId,
          intent: intentResult.type,
          fsmState: fsmCtx.currentState,
          fsmTrigger: postTransition.trigger,
          uiControl,
          ...ragMeta,
        })
      });

    } catch (error: any) {
      console.error('SSE Error:', error);
      await streamEvent.writeSSE({
        data: JSON.stringify({ error: error.message || 'LLM API Request Failed' })
      });
    }
  });
});

/**
 * 辅助函数：保存会话到 D1（含 FSM 状态）
 */
async function saveToD1(
  db: D1Database,
  sessionId: string,
  messages: ChatMessage[],
  stageNum: number,
  fsmCtx: FSMContext,
) {
  try {
    const messagesJson = JSON.stringify(messages);
    const title = messages.find(m => m.role === 'user')?.content.substring(0, 20) || '新对话';
    const fsmState = fsmCtx.currentState;
    const fsmContextJson = JSON.stringify(fsmCtx);

    await db.prepare(`
      INSERT INTO sessions (id, title, messages, current_stage, fsm_state, fsm_context, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE SET 
        messages = excluded.messages,
        current_stage = excluded.current_stage,
        fsm_state = excluded.fsm_state,
        fsm_context = excluded.fsm_context,
        updated_at = unixepoch()
    `).bind(sessionId, title, messagesJson, stageNum, fsmState, fsmContextJson).run();
  } catch (e) {
    console.error('Failed to save session to D1:', e);
  }
}
