import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type OpenAI from 'openai';
import { getLLMClient, getModelName, getModelSequence, buildSystemPromptFSM } from '../lib/llm';
import { detectStage, stageToIndex } from '../lib/cbt-stages';
import { classifyIntent } from '../lib/intent-router';
import { assessRisk } from '../lib/risk';
import { decideRAGRetrieval, retrieveContext } from '../lib/rag';
import {
  transition,
  applyTransition,
  createDefaultContext,
  type FSMContext,
  type FSMState,
} from '../lib/fsm';
import { evaluateSandplay } from '../lib/sandplay-evaluator';
import { requireAuth } from '../lib/auth-utils';
import type { Env, ChatRequest, ChatMessage, SessionRow, HonoSchema, AuthUser, MessageTechChain } from '../types';

const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  techChain: z.record(z.unknown()).optional(),
});

const userProfileSchema = z.object({
  weather: z.enum(['Storm', 'Thunder', 'Fog', 'Sunny']),
  safetyIsland: z.enum(['Arcade', 'DeepSea', 'MusicFestival']),
  stressor: z.enum(['Academic', 'SelfEsteem', 'Relationship']),
});

const facialEmotionSchema = z.object({
  label: z.string(),
  labelZh: z.string(),
  confidence: z.number(),
});

const miniatureItemSchema = z.object({
  id: z.string(),
  assetKey: z.string(),
  category: z.enum(['self', 'emotion', 'obstacle', 'resource']),
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  scale: z.number(),
  rotation: z.number(),
});

const sandplayStateSchema = z.object({
  terrain: z.enum(['desert', 'starry_sky', 'stormy_sea', 'forest']),
  miniatures: z.array(miniatureItemSchema),
  createdAt: z.string(),
});

const chatRequestSchema = z.object({
  sessionId: z.string().optional(),
  messages: z.array(chatMessageSchema, { required_error: 'messages cannot be empty' })
    .min(1, 'messages cannot be empty'),
  stream: z.boolean().optional().default(true),
  profile: userProfileSchema.optional(),
  facialEmotion: facialEmotionSchema.optional(),
  model: z.string().optional(),
  sandplayState: sandplayStateSchema.optional(),
});

export const chatRouter = new Hono<HonoSchema>();

chatRouter.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const rawBody = await c.req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || 'messages cannot be empty';
    return c.json({ error: errorMsg }, 400);
  }
  const { messages, stream, sessionId: providedSessionId, profile, facialEmotion, model: requestedModel, sandplayState } = parsed.data;
  const sessionId = providedSessionId || crypto.randomUUID();

  // ── 1. 从 D1 获取历史会话 + FSM 状态 ──
  let currentStageIndex = 0;
  let fsmCtx: FSMContext = createDefaultContext();

  try {
    if (c.env?.DB) {
      const session = await c.env.DB.prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first<SessionRow>();

      if (session) {
        if (session.user_id && session.user_id !== user.uid) {
          return c.json({ error: 'Forbidden: Session does not belong to you' }, 403);
        }
        
        // Auto-bind anonymous session to logged-in user
        if (!session.user_id && c.env.DB) {
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

  // ── 阻断AI答复（危机覆盖层） ──
  if (fsmCtx.currentState === 'Crisis_Escalation') {
    // 不再调用大模型，直接返回并停止后续生成
    await saveToD1(c.env.DB, sessionId, messages, currentStageIndex + 1, fsmCtx, user.uid);

    if (!stream) {
      return c.json({
        content: '',
        stage: currentStageIndex + 1,
        sessionId,
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        fsmTrigger: preTransition.trigger,
        riskLevel: 'crisis',
        ragQueried: true,
        ragRetrievalMode: 'forced_safety',
        ragChunks: 0,
        ragSources: [],
      });
    }

    return streamSSE(c, async (streamEvent) => {
      await streamEvent.writeSSE({
        data: JSON.stringify({
          delta: '',
          stage: currentStageIndex + 1,
          done: true,
          sessionId,
          intent: intentResult.type,
          fsmState: fsmCtx.currentState,
          fsmTrigger: preTransition.trigger,
          riskLevel: 'crisis',
          ragQueried: true,
          ragRetrievalMode: 'forced_safety',
          ragChunks: 0,
          ragSources: [],
        })
      });
    });
  }

  // ── 4. RAG 检索（由模型自行决定是否需要查询知识库） ──
  let ragContext = undefined;
  let ragDecision = {
    shouldRetrieve: false,
    query: userLastMessage,
    reason: '默认未触发知识库查询。',
  };
  let ragRetrievalMode: 'ai_decision' | 'forced_safety' = 'ai_decision';

  const safetyQuery = buildSafetyRetrievalQuery(userLastMessage, intentResult.type, fsmCtx.currentState);
  if (safetyQuery) {
    ragRetrievalMode = 'forced_safety';
    ragDecision = {
      shouldRetrieve: true,
      query: safetyQuery,
      reason: '检测到危机或校园安全相关线索，强制优先查询安全边界与求助类知识。',
    };
  } else {
    try {
      ragDecision = await decideRAGRetrieval(c.env, {
        userMessage: userLastMessage,
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        recentMessages: messages.slice(-4).map((m) => `${m.role}: ${m.content}`),
      });
      console.log(`[RAG Decision] shouldRetrieve=${ragDecision.shouldRetrieve}, query=${ragDecision.query}, reason=${ragDecision.reason}`);
    } catch (e) {
      console.warn('[RAG Decision] failed, proceeding without retrieval:', e);
    }
  }

  if (ragDecision.shouldRetrieve) {
    try {
      ragContext = await retrieveContext(c.env, ragDecision.query, 24, ragRetrievalMode === 'forced_safety' ? 0.35 : 0.42, {
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        userMessage: userLastMessage,
        finalTopK: 5,
        safetyFirst: ragRetrievalMode === 'forced_safety',
      });
      console.log(`[RAG] Retrieved ${ragContext.chunks.length} chunks for query="${ragDecision.query}"`);
    } catch (e) {
      console.warn('[RAG] Retrieval failed, proceeding without knowledge context:', e);
    }
  }

  const riskAssessment = assessRisk({
    intent: intentResult.type,
    intentConfidence: Math.round(intentResult.confidence * 100),
    fsmState: fsmCtx.currentState,
    ragRetrievalMode,
    ragQueried: ragDecision.shouldRetrieve,
    triggers: intentResult.triggers,
    userMessage: userLastMessage,
  });

  let sandplayDesc = undefined;
  if (sandplayState) {
    try {
      sandplayDesc = evaluateSandplay(sandplayState);
      console.log('[Sandplay] Evaluated description length:', sandplayDesc.length);
    } catch(e) {
      console.warn('[Sandplay] Evaluator error:', e);
    }
  }

  // ── 5. 构建 System Prompt（基于 FSM 状态） ──
  const systemPrompt = buildSystemPromptFSM(fsmCtx.currentState, intentResult.type, ragContext, profile, facialEmotion, fsmCtx.icebreaker, sandplayDesc);

  const client = getLLMClient(c.env);
  const model = getModelName(c.env, requestedModel);

  // 准备 RAG 元数据（含片段摘要，前80字）
  const ragMeta = {
    ragRetrievalMode,
    ragQueried: ragDecision.shouldRetrieve,
    ragQuery: ragDecision.query,
    ragDecisionReason: ragDecision.reason,
    ragChunks: ragContext?.chunks?.length || 0,
    ragSources: ragContext?.sourceDocuments || [],
    ragScores: ragContext?.scores?.map(s => Math.round(s * 100) / 100) || [],
    ragSnippets: ragContext?.chunks?.map(c => c.substring(0, 80).replace(/\n/g, ' ').trim()) || [],
    riskLevel: riskAssessment.level,
    riskReason: riskAssessment.reason,
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
      const modelsToTry = getModelSequence(c.env, requestedModel);
      let response: OpenAI.Chat.Completions.ChatCompletion | null = null;
      let lastError: unknown = null;
      let usedModel = model;

      for (const currentModel of modelsToTry) {
        try {
          console.log(`[LLM] Trying model: ${currentModel}`);
          response = await client.chat.completions.create({
            model: currentModel,
            messages: fullMessages,
            stream: false,
            temperature: 0.6,
            response_format: { type: 'json_object' },
          });
          usedModel = currentModel;
          break;
        } catch (err) {
          console.warn(`[LLM] Model ${currentModel} failed:`, err);
          lastError = err;
        }
      }

      if (!response) {
        throw lastError || new Error('All fallback models failed');
      }

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
      let sandplay_invite = undefined;
      let sandplay_close = undefined;
      let sandplay_suggestion = undefined;

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
        
        if (parsed.sandplay_invite) sandplay_invite = parsed.sandplay_invite;
        if (parsed.sandplay_close) sandplay_close = parsed.sandplay_close;
        if (parsed.sandplay_suggestion) sandplay_suggestion = parsed.sandplay_suggestion;

        
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
        const finalTechChain = {
        ...ragMeta,
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        fsmTrigger: postTransition.trigger,
        retrievedEvidence,
        reasoningDeduction,
        model: usedModel,
      };
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: cleanReply, techChain: finalTechChain as unknown as MessageTechChain }];
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
        sandplay_invite,
        sandplay_close,
        sandplay_suggestion,
        ...ragMeta,
        model: usedModel,
      });
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Chat processing failed';
      return c.json({ error: message }, 500);
    }
  }

  // ── 7. SSE 流式响应 ──
  return streamSSE(c, async (streamEvent) => {
    try {
      const modelsToTry = getModelSequence(c.env, requestedModel);
      let completionStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> | null = null;
      let lastError: unknown = null;
      let usedModel = model;

      for (const currentModel of modelsToTry) {
        try {
          console.log(`[LLM Stream] Trying model: ${currentModel}`);
          completionStream = await client.chat.completions.create({
            model: currentModel,
            messages: fullMessages,
            stream: true,
            temperature: 0.6,
            response_format: { type: 'json_object' },
          });
          usedModel = currentModel;
          break;
        } catch (err) {
          console.warn(`[LLM Stream] Model ${currentModel} failed:`, err);
          lastError = err;
        }
      }

      if (!completionStream) {
        throw lastError || new Error('All fallback models failed in stream mode');
      }

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
                      model: usedModel,
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
      let reasoningDeduction = undefined;
      let sandplay_invite = undefined;
      let sandplay_close = undefined;
      let sandplay_suggestion = undefined;
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
        if (parsed.reasoning_deduction) reasoningDeduction = parsed.reasoning_deduction;
        if (parsed.agent_reply) {
          finalReply = parsed.agent_reply;
        } else if (parsed.reply) {
          finalReply = parsed.reply;
        } else if (parsed.message) {
          finalReply = parsed.message;
        }
        
        if (parsed.sandplay_invite) sandplay_invite = parsed.sandplay_invite;
        if (parsed.sandplay_close) sandplay_close = parsed.sandplay_close;
        if (parsed.sandplay_suggestion) sandplay_suggestion = parsed.sandplay_suggestion;

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
      const finalTechChain = {
        ...ragMeta,
        intent: intentResult.type,
        fsmState: fsmCtx.currentState,
        fsmTrigger: postTransition.trigger,
        retrievedEvidence,
        reasoningDeduction,
      };
      const updatedMessages: ChatMessage[] = [...messages, { role: 'assistant', content: finalReply, techChain: finalTechChain as unknown as MessageTechChain }];
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
          reasoning_deduction: reasoningDeduction,
          retrieved_evidence: retrievedEvidence,
          icebreakerLayer: fsmCtx.icebreaker.layer,
          sandplay_invite,
          sandplay_close,
          sandplay_suggestion,
          ...ragMeta,
          model: usedModel,
        })
      });

    } catch (error: unknown) {
      const message = (error as Error)?.message || 'LLM API Request Failed';
      console.error('SSE Error:', error);
      await streamEvent.writeSSE({
        data: JSON.stringify({ error: message })
      });
    }
  });
});



/**
 * 辅助函数：保存会话到 D1（含 FSM 状态与 Payload 截断保护）
 */
async function saveToD1(
  db: D1Database | null | undefined,
  sessionId: string,
  messages: ChatMessage[],
  stageNum: number,
  fsmCtx: FSMContext,
  userId: string,
) {
  if (!db) {
    console.warn('D1 Database binding missing, skipping saveToD1');
    return;
  }

  try {
    const MAX_JSON_BYTES = 200 * 1024; // 200KB D1 列容量保护阈值
    let processedMessages = messages.map(msg => {
      const copy: ChatMessage = {
        ...msg,
        id: msg.id || crypto.randomUUID()
      };
      // 限制单条消息内容最大字数（防止个别超长文本填爆 DB）
      if (copy.content && copy.content.length > 12000) {
        copy.content = copy.content.substring(0, 12000) + '... [truncated]';
      }
      return copy;
    });

    let messagesJson = JSON.stringify(processedMessages);
    // 超出 200KB 时，修剪中部历史消息，保留首条上下文与最新轮次
    if (new TextEncoder().encode(messagesJson).byteLength > MAX_JSON_BYTES && processedMessages.length > 8) {
      const firstMsg = processedMessages[0];
      const recent = processedMessages.slice(-16);
      processedMessages = [firstMsg, ...recent];
      messagesJson = JSON.stringify(processedMessages);

      // 若仍超限，安全清理旧消息中的 techChain 大字段
      if (new TextEncoder().encode(messagesJson).byteLength > MAX_JSON_BYTES) {
        processedMessages = processedMessages.map((m, idx) => {
          if (idx < processedMessages.length - 2 && m.techChain) {
            const { techChain, ...rest } = m;
            return rest;
          }
          return m;
        });
        messagesJson = JSON.stringify(processedMessages);
      }
    }

    const rawTitle = messages.find(m => m.role === 'user')?.content || '新对话';
    const title = rawTitle.substring(0, 40);
    const fsmState = fsmCtx.currentState;

    let fsmContextJson = JSON.stringify(fsmCtx);
    if (new TextEncoder().encode(fsmContextJson).byteLength > 40 * 1024) {
      fsmContextJson = JSON.stringify({ currentState: fsmCtx.currentState, turnCount: fsmCtx.turnCount });
    }

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
    `).bind(sessionId, title, messagesJson, stageNum, fsmState, fsmContextJson, userId || null).run();
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

function buildSafetyRetrievalQuery(
  userMessage: string,
  intent: string,
  fsmState: string,
): string | null {
  const text = userMessage.trim();
  const safetySignals = [
    '不想活', '想死', '自杀', '自伤', '自残', '割腕', '吞药', '跳楼',
    '伤害自己', '不想醒', '活不下去', '结束生命',
  ];
  const schoolSafetySignals = [
    '欺凌', '霸凌', '排挤', '孤立', '威胁', '勒索', '打我', '辱骂',
    '传谣', '偷拍视频', '校园暴力',
  ];

  const hasSafetySignal = safetySignals.some(signal => text.includes(signal));
  const hasSchoolSafetySignal = schoolSafetySignals.some(signal => text.includes(signal));

  if (intent === 'crisis' || fsmState === 'Crisis_Escalation' || hasSafetySignal) {
    return `${text} 自伤自杀危机识别 安全计划 现实求助 热线 监护人 未成年人`;
  }

  if (hasSchoolSafetySignal) {
    return `${text} 校园欺凌 同伴排挤 安全评估 求助老师家长 证据保留 未成年人保护`;
  }

  return null;
}
