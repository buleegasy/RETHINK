import { Hono } from 'hono';
import { requireAuth } from '../lib/auth-utils';
import type { Env } from '../types';
import { buildVoiceInstructions } from '../lib/voice-instructions';
import { retrieveContext } from '../lib/rag';

export const voiceRouter = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// 1. 获取 Ephemeral Token
voiceRouter.post('/token', requireAuth, async (c) => {
  const user = c.get('user');
  const env = c.env;
  
  if (!env.OPENAI_API_KEY) {
    return c.json({ error: 'OPENAI_API_KEY is not configured' }, 500);
  }

  const instructions = buildVoiceInstructions({ userName: user?.displayName || 'User' });

  const payload = {
    model: 'gpt-4o-realtime-preview',
    voice: 'coral',
    modalities: ['audio', 'text'],
    instructions: instructions,
    input_audio_transcription: { model: 'whisper-1' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 700,
      create_response: false, // 遵循极低延迟与 RAG 保护策略
    },
    temperature: 0.7,
    max_response_output_tokens: 150,
    tools: [
      {
        type: 'function',
        name: 'search_knowledge_base',
        description: '当用户提到具体的心理困扰、情绪问题、学业压力、人际关系等需要专业心理学知识支持的话题时，搜索 CBT 认知行为疗法知识库获取专业参考材料。不要对闲聊或简单问候触发此工具。',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '用于检索知识库的搜索查询语句，应提取用户核心困扰关键词' }
          },
          required: ['query']
        }
      },
      {
        type: 'function',
        name: 'report_state',
        description: '当对话进入新的 CBT 阶段时调用。阶段包括：Active_Listening（积极倾听）、CBT_Stripping（ABC 事实剥离）、Socratic_Questioning（苏格拉底式提问与认知重构）。每次你判断对话应该推进到下一个阶段时，调用此工具汇报。',
        parameters: {
          type: 'object',
          properties: {
            stage: { type: 'string', enum: ['Active_Listening', 'CBT_Stripping', 'Socratic_Questioning'] },
            reason: { type: 'string', description: '简短说明为何推进到此阶段' }
          },
          required: ['stage']
        }
      },
      {
        type: 'function',
        name: 'escalate_crisis',
        description: '当用户表达出自杀意念、自伤行为、或任何危及生命安全的内容时，立即调用此工具。这将触发前端的紧急干预界面。',
        parameters: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['high', 'crisis'] },
            trigger_text: { type: 'string', description: '触发危机判断的关键用户话语' }
          },
          required: ['severity', 'trigger_text']
        }
      },
      {
        type: 'function',
        name: 'save_user_info',
        description: '当用户首次告知自己的名字/昵称时，调用此工具保存以便跨会话记忆。',
        parameters: {
          type: 'object',
          properties: {
            user_name: { type: 'string' }
          },
          required: ['user_name']
        }
      }
    ],
    tool_choice: 'auto'
  };

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      return c.json({ error: 'Failed to create ephemeral token', details: errorText }, response.status as any);
    }

    const data = await response.json();
    return c.json(data);
  } catch (err: any) {
    console.error('Failed to fetch from OpenAI:', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

// schemas
const ragQuerySchema = z.object({
  query: z.string().min(1),
  top_k: z.number().optional().default(3)
});

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.string(),
  content: z.any()
}).passthrough();

const persistSchema = z.object({
  session_id: z.string().min(1),
  fsm_state: z.string().optional().default('Onboarding'),
  messages: z.array(messageSchema).min(1)
});

// 2. RAG 查询
voiceRouter.post('/rag/query', requireAuth, zValidator('json', ragQuerySchema), async (c) => {
  const env = c.env;
  const { query } = c.req.valid('json');

  try {
    const contextStr = await retrieveContext(env, query);
    return c.json({ context: contextStr });
  } catch (err: any) {
    console.error('RAG Query Error:', err);
    return c.json({ error: 'Failed to query RAG' }, 500);
  }
});

// 3. 通话记录持久化
voiceRouter.post('/persist', requireAuth, zValidator('json', persistSchema), async (c) => {
  const user = c.get('user');
  const env = c.env;
  const { session_id, messages, fsm_state } = c.req.valid('json');

  const messagesWithId = messages.map((msg: any) => ({
    ...msg,
    id: msg.id || crypto.randomUUID()
  }));
  const messagesJson = JSON.stringify(messagesWithId);
  
  let title = '语音对话';
  const firstUserMsg = messages.find((m: any) => m.role === 'user');
  if (firstUserMsg && typeof firstUserMsg.content === 'string') {
    title = firstUserMsg.content.substring(0, 20);
  }

  // 使用 waitUntil 放到后台执行，不阻塞返回 0ms 响应
  c.executionCtx.waitUntil(
    env.DB.prepare(`
      INSERT INTO sessions (id, title, messages, current_stage, fsm_state, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE SET 
        messages = excluded.messages,
        current_stage = excluded.current_stage,
        fsm_state = excluded.fsm_state,
        updated_at = unixepoch()
    `).bind(
      session_id,
      title,
      messagesJson,
      0,
      fsm_state,
      user.uid
    ).run().catch(err => {
      console.error('Background Persist Error:', err);
    })
  );

  return c.json({ ok: true });
});
