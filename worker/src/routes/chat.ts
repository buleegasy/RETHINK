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
import { requireAuth } from '../lib/auth-utils';
import type { Env, ChatRequest, ChatMessage, SessionRow, HonoSchema, AuthUser } from '../types';

export const chatRouter = new Hono<HonoSchema>();

chatRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user') as AuthUser;
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
      .first<any>();

    if (session) {
      if (session.user_id && session.user_id !== user.uid) {
        return c.json({ error: 'Forbidden: Session does not belong to you' }, 403);
      }
      
      // Auto-bind anonymous session to logged-in user
      if (!session.user_id) {
        await c.env.DB.prepare('UPDATE sessions SET user_id = ?, updated_at = unixepoch() WHERE id = ?')
          .bind(user.uid, sessionId)
          .run();
      }

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
  const intentResult = await classifyIntent(userLastMessage, c.env);

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
  const systemPrompt = buildSystemPromptFSM(fsmCtx.currentState, intentResult.type, ragContext, profile, facialEmotion, fsmCtx.icebreaker);

  const client = getLLMClient(c.env);
  const model = getModelName(c.env, requestedModel);

  // 准备 RAG 元数据（含片段摘要，前80字）
  const ragMeta = {
    ragChunks: ragContext?.chunks?.length || 0,
    ragSources: ragContext?.sourceDocuments || [],
    ragScores: ragContext?.scores?.map(s => Math.round(s * 100) / 100) || [],
    ragSnippets: ragContext?.chunks?.map(c => c.substring(0, 80).replace(/\n/g, ' ').trim()) || [],
    // 意图识别详细数据
    intentConfidence: Math.round(intentResult.confidence * 100),
    intentTriggers: intentResult.triggers,
    intentEmotion: intentResult.emotion,
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
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content || '';
      let finalJsonStr = responseText.trim();
      if (finalJsonStr.startsWith('```json')) {
        finalJsonStr = finalJsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      } else if (finalJsonStr.startsWith('```')) {
        finalJsonStr = finalJsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
      }

      let cleanReply = finalJsonStr;
      let uiControl = undefined;
      let reasoningDeduction = undefined;
      let retrievedEvidence = undefined;

      try {
        const parsed = JSON.parse(finalJsonStr);
        if (parsed.agent_reply) {
          cleanReply = parsed.agent_reply;
        } else if (parsed.reply) {
          cleanReply = parsed.reply;
        } else if (parsed.message) {
          cleanReply = parsed.message;
        }
        
        if (parsed.ui_control) {
          uiControl = parsed.ui_control;
        }

        if (parsed.reasoning_deduction) {
          reasoningDeduction = parsed.reasoning_deduction;
        }

        if (parsed.retrieved_evidence) {
          retrievedEvidence = parsed.retrieved_evidence;
        }

        
        // 解析破冰画像增量更新 (Onboarding 阶段)
        if (parsed.icebreaker_update && fsmCtx.currentState === 'Onboarding') {
          fsmCtx.icebreaker = applyIcebreakerUpdate(fsmCtx.icebreaker, parsed.icebreaker_update);
          console.log(`[Icebreaker Non-Stream] Layer ${fsmCtx.icebreaker.layer}, moodWord=${fsmCtx.icebreaker.moodWord || 'n/a'}`);
        }
      } catch (e) {
        console.warn('Failed to parse final JSON in non-streaming mode:', e);
      }

      const stage = detectStage(cleanReply, currentStageIndex);

      // FSM Post-response 转移
      fsmCtx.turnCount += 1; // AI 回复也计入 turnCount
      const postTransition = transition(fsmCtx, intentResult, 'post', cleanReply);
      fsmCtx = applyTransition(fsmCtx, postTransition);

      console.log(`[FSM] post-transition: ${postTransition.trigger} → state=${fsmCtx.currentState}`);

      // 保存回 D1（存入干净的对话内容而非原始 JSON）
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: cleanReply }];
      await saveToD1(c.env.DB, sessionId, updatedMessages, stageToIndex(stage) + 1, fsmCtx, user.uid);

      return c.json({
        content: cleanReply,
        stage,
        sessionId,
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        fsmTrigger: postTransition.trigger,
        uiControl,
        reasoning_deduction: reasoningDeduction,
        retrieved_evidence: retrievedEvidence,
        icebreakerLayer: fsmCtx.icebreaker.layer,
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
        response_format: { type: 'json_object' },
      });

      let fullResponse = '';
      let extractedReply = '';
      let sentUnescapedLength = 0;
      let isExtracting = false;
      let hasFinishedExtraction = false;
      let isPlainTextFallback = false;

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

          if (!isExtracting && !isPlainTextFallback) {
            const trimmed = fullResponse.trim();
            // 检查是否是非 JSON 纯文本开头
            if (trimmed.length > 5 && !trimmed.startsWith('{') && !trimmed.startsWith('`')) {
              isPlainTextFallback = true;
            } else {
              const match = fullResponse.match(/"agent_reply"\s*:\s*"/);
              if (match && match.index !== undefined) {
                isExtracting = true;
              }
            }
          }
          
          if (isPlainTextFallback) {
            const trueDelta = fullResponse.substring(sentUnescapedLength);
            if (trueDelta) {
              sentUnescapedLength = fullResponse.length;
              await streamEvent.writeSSE({
                data: JSON.stringify({
                  delta: trueDelta,
                  stage: detectStage(fullResponse, currentStageIndex),
                  done: false,
                  sessionId,
                  intent: intentResult.type,
                  fsmState: fsmCtx.currentState,
                  ...ragMeta,
                })
              });
            }
          } else if (isExtracting) {
            const match = fullResponse.match(/"agent_reply"\s*:\s*"/);
            if (match && match.index !== undefined) {
              const startContent = fullResponse.substring(match.index + match[0].length);
              const endIdx = getUnescapedQuoteIndex(startContent);
              
              if (endIdx !== -1) {
                extractedReply = startContent.substring(0, endIdx);
                hasFinishedExtraction = true;
              } else {
                extractedReply = startContent;
              }

              // 如果 extractedReply 以单个反斜杠结尾，说明遇到了一个不完整的转义序列（比如刚好截断在 \n 的 \）
              // 此时我们不立刻发送，等待下一个 chunk 补全
              if (extractedReply && !extractedReply.endsWith('\\')) {
                const unescapedFull = extractedReply.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                const trueDelta = unescapedFull.substring(sentUnescapedLength);
                
                if (trueDelta) {
                  sentUnescapedLength = unescapedFull.length;
                  await streamEvent.writeSSE({
                    data: JSON.stringify({
                      delta: trueDelta,
                      stage: detectStage(unescapedFull, currentStageIndex),
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
      }

      // ── 流结束：尝试解析完整 JSON ──
      let uiControl = undefined;
      let retrievedEvidence = undefined;
      let finalReply = extractedReply;
      
      let cleanResponse = fullResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
      }
      
      try {
        const parsed = JSON.parse(cleanResponse);
        if (parsed.ui_control) uiControl = parsed.ui_control;
        if (parsed.retrieved_evidence) retrievedEvidence = parsed.retrieved_evidence;
        if (parsed.agent_reply) {
          finalReply = parsed.agent_reply;
        } else if (parsed.reply) {
          finalReply = parsed.reply;
        } else if (parsed.message) {
          finalReply = parsed.message;
        }

        // 解析破冰画像增量更新
        if (parsed.icebreaker_update && fsmCtx.currentState === 'Onboarding') {
          fsmCtx.icebreaker = applyIcebreakerUpdate(fsmCtx.icebreaker, parsed.icebreaker_update);
          console.log(`[Icebreaker] Layer ${fsmCtx.icebreaker.layer}, moodWord=${fsmCtx.icebreaker.moodWord || 'n/a'}, stressor=${fsmCtx.icebreaker.primaryStressor || 'n/a'}`);
        }
      } catch (e) {
        console.warn('Failed to parse final JSON from AI:', e);
        if (isPlainTextFallback || !finalReply) {
          finalReply = cleanResponse;
        }
      }

      // ── FSM Post-response 转移 ──
      fsmCtx.turnCount += 1;
      const postTransition = transition(fsmCtx, intentResult, 'post', finalReply);
      fsmCtx = applyTransition(fsmCtx, postTransition);

      console.log(`[FSM] post-transition: ${postTransition.trigger} → state=${fsmCtx.currentState}`);

      // 计算最终 CBT 阶段（向后兼容）
      const finalStage = detectStage(finalReply, currentStageIndex);
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: finalReply }];
      await saveToD1(c.env.DB, sessionId, updatedMessages, stageToIndex(finalStage) + 1, fsmCtx, user.uid);

      // 发送结束标志（含 FSM 状态转移信息 + UI 控制参数 + 破冰层级）
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
          retrieved_evidence: retrievedEvidence,
          icebreakerLayer: fsmCtx.icebreaker.layer,
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
  userId: string,
) {
  try {
    const messagesJson = JSON.stringify(messages);
    const title = messages.find(m => m.role === 'user')?.content.substring(0, 20) || '新对话';
    const fsmState = fsmCtx.currentState;
    const fsmContextJson = JSON.stringify(fsmCtx);

    await db.prepare(`
      INSERT INTO sessions (id, title, messages, current_stage, fsm_state, fsm_context, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE SET 
        title = CASE WHEN sessions.title = '新对话' THEN excluded.title ELSE sessions.title END,
        messages = excluded.messages,
        current_stage = excluded.current_stage,
        fsm_state = excluded.fsm_state,
        fsm_context = excluded.fsm_context,
        user_id = excluded.user_id,
        updated_at = unixepoch()
    `).bind(sessionId, title, messagesJson, stageNum, fsmState, fsmContextJson, userId).run();
  } catch (e) {
    console.error('Failed to save session to D1:', e);
  }
}

/**
 * 破冰画像增量更新：将 AI 输出的 icebreaker_update 合并到 FSMContext
 */
function applyIcebreakerUpdate(
  current: import('../lib/fsm').IcebreakerProfile,
  update: Record<string, unknown>,
): import('../lib/fsm').IcebreakerProfile {
  const result = { ...current };

  // 推进层级
  if (typeof update.next_layer === 'number') {
    result.layer = update.next_layer;
  }

  // 各维度增量更新（仅更新非 null 字段）
  if (update.mood_word != null) result.moodWord = String(update.mood_word);
  if (update.attribution_style != null) result.attributionStyle = update.attribution_style as typeof result.attributionStyle;
  if (update.vulnerability_stance != null) result.vulnerabilityStance = update.vulnerability_stance as typeof result.vulnerabilityStance;
  if (update.primary_stressor != null) result.primaryStressor = String(update.primary_stressor);
  if (update.social_support != null) result.socialSupport = update.social_support as typeof result.socialSupport;
  if (update.duration != null) result.duration = update.duration as typeof result.duration;
  if (update.expressed_need != null) result.expressedNeed = String(update.expressed_need);
  if (update.profile_summary != null) result.profileSummary = String(update.profile_summary);

  // 数组字段：累加而非覆盖
  if (Array.isArray(update.core_beliefs) && update.core_beliefs.length > 0) {
    result.coreBeliefs = [...result.coreBeliefs, ...update.core_beliefs.map(String)];
  }
  if (typeof update.observations === 'string' && update.observations) {
    result.observations = [...result.observations, update.observations];
  }

  // AI 主动退出破冰信号
  if (update.exit_icebreaker === true) {
    result.exitSignal = true;
  }

  return result;
}
