/**
 * scripts/pre-info-verify.mjs
 * Standalone Automated Verification Script for Milestone M5:
 * Pre-Info Receptionist Flow, CBT Transition, Cross-Session Memory Persistence & Deletion Sync, Tone Diversity & Prohibited Word Assertions (R1..R4).
 *
 * Verification Requirements:
 * - Test Case 1 (R1): Conversational Pre-Info Collection (Receptionist greeting, initial Pre_Info_Collection state).
 * - Test Case 2 (R2): Smooth State Transition to Formal Counseling (User submits name "我叫小明", state transitions to Active_Listening, system prompt injects user name).
 * - Test Case 3 (R3): Cross-Session Memory Persistence & Deletion Sync (Inherit userName in new sessions with fromMemory: true, delete session via DELETE /api/auth/sessions/:id clean-clearing user_memories).
 * - Test Case 4 (R4): Greeting Diversity & Prohibited Word Assertion (RECEPTIONIST_GREETING_CANDIDATES diversity, zero occurrence of "卧槽" or vulgar words in LLM prompts, greetings, and SSE streaming deltas).
 *
 * Zero external network calls. Runs in-memory using Hono app.request() + SQLite D1 Mock.
 */

import { MemoryService } from '../worker/src/lib/memory.ts';
import { buildSystemPromptFSM } from '../worker/src/lib/llm.ts';
import {
  RECEPTIONIST_GREETING_CANDIDATES,
  getRandomReceptionistGreeting,
} from '../worker/src/lib/fsm.ts';
import {
  sanitizeResponse,
  getEmittableAndBuffer,
  containsProhibitedWords,
} from '../worker/src/lib/sanitizer.ts';

// Color formatting for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

function logHeader(text) {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${text}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);
}

function logPass(stage, message) {
  console.log(`${colors.bold}${colors.green}[${stage}-PASS]${colors.reset} ${message}`);
}

function logFail(stage, message) {
  console.error(`${colors.bold}${colors.red}[${stage}-FAIL]${colors.reset} ${message}`);
}

// In-Memory D1 Mock Store matching Cloudflare D1 interface
function createMockD1Database() {
  const sessionsStore = [];
  const memoriesStore = [];
  let seq = 0;

  return {
    sessionsStore,
    memoriesStore,
    prepare: (sql) => ({
      bind: (...args) => ({
        run: async () => {
          if (sql.includes('INSERT INTO user_memories')) {
            const [id, user_id, session_id, memory_key, memory_value] = args;
            seq++;
            memoriesStore.push({
              id,
              user_id,
              session_id,
              memory_key,
              memory_value,
              created_at: Date.now() + seq,
            });
            return { meta: { changes: 1 } };
          }
          if (sql.includes('DELETE FROM user_memories WHERE session_id = ?')) {
            const [session_id] = args;
            const before = memoriesStore.length;
            for (let i = memoriesStore.length - 1; i >= 0; i--) {
              if (memoriesStore[i].session_id === session_id) {
                memoriesStore.splice(i, 1);
              }
            }
            return { meta: { changes: before - memoriesStore.length } };
          }
          if (sql.includes('INSERT INTO sessions')) {
            const [id, title, messages, current_stage, fsm_state, fsm_context, user_id] = args;
            const idx = sessionsStore.findIndex(s => s.id === id);
            if (idx !== -1) {
              sessionsStore[idx] = { id, title, messages, current_stage, fsm_state, fsm_context, user_id, updated_at: Date.now() };
            } else {
              sessionsStore.push({ id, title, messages, current_stage, fsm_state, fsm_context, user_id, created_at: Date.now(), updated_at: Date.now() });
            }
            return { meta: { changes: 1 } };
          }
          if (sql.includes('UPDATE sessions SET user_id = ?')) {
            const [user_id, id] = args;
            const match = sessionsStore.find(s => s.id === id);
            if (match) match.user_id = user_id;
            return { meta: { changes: match ? 1 : 0 } };
          }
          if (sql.includes('DELETE FROM sessions WHERE id = ?')) {
            const [sessionId] = args;
            const idx = sessionsStore.findIndex(s => s.id === sessionId);
            if (idx !== -1) sessionsStore.splice(idx, 1);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        first: async () => {
          if (sql.includes('SELECT memory_value FROM user_memories')) {
            const [user_id, memory_key] = args;
            const matches = memoriesStore
              .filter(m => m.user_id === user_id && m.memory_key === memory_key)
              .sort((a, b) => b.created_at - a.created_at);
            return matches[0] ? { memory_value: matches[0].memory_value } : null;
          }
          if (sql.includes('SELECT * FROM sessions WHERE id = ?')) {
            const [id] = args;
            return sessionsStore.find(s => s.id === id) || null;
          }
          if (sql.includes('SELECT id, user_id FROM sessions WHERE id = ?')) {
            const [id] = args;
            const match = sessionsStore.find(s => s.id === id);
            return match ? { id: match.id, user_id: match.user_id } : null;
          }
          return null;
        },
        all: async () => {
          if (sql.includes('FROM user_memories WHERE session_id = ?')) {
            const [sessionId] = args;
            return { results: memoriesStore.filter(m => m.session_id === sessionId) };
          }
          if (sql.includes('FROM sessions WHERE user_id = ?')) {
            const [user_id] = args;
            return { results: sessionsStore.filter(s => s.user_id === user_id) };
          }
          return { results: [] };
        }
      })
    })
  };
}

// Global fetch Interceptor for LLM Zero-Network Mocking
const originalFetch = globalThis.fetch;
globalThis.fetch = async function mockFetch(url, options) {
  try {
    let urlStr = '';
    let requestBodyObj = {};

    if (typeof url === 'string') {
      urlStr = url;
    } else if (url && typeof url === 'object') {
      urlStr = url.url || url.href || String(url);
    }

    if (urlStr.includes('/chat/completions') || urlStr.includes('openrouter') || urlStr.includes('googleapis')) {
      let bodyText = '';
      if (options && options.body) {
        if (typeof options.body === 'string') {
          bodyText = options.body;
        } else if (options.body instanceof Uint8Array || options.body instanceof ArrayBuffer) {
          bodyText = new TextDecoder().decode(options.body);
        } else if (typeof options.body.toString === 'function') {
          bodyText = options.body.toString();
        }
      } else if (url && typeof url === 'object' && typeof url.text === 'function') {
        try {
          bodyText = await url.clone().text();
        } catch (e) {}
      }

      try {
        requestBodyObj = JSON.parse(bodyText || '{}');
      } catch (e) {}

      const messages = requestBodyObj.messages || [];
      const sysMsg = messages.find(m => m.role === 'system')?.content || '';
      const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

      // Check if this is intent classifier call
      if (sysMsg.includes('分类器') || sysMsg.includes('意图分类')) {
        let intentType = 'casual';
        if (lastUserMsg.includes('累') || lastUserMsg.includes('难受') || lastUserMsg.includes('烦')) {
          intentType = 'emotional';
        }
        return new Response(JSON.stringify({
          id: 'mock-intent-' + Date.now(),
          choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify({ type: intentType, emotion: 'Neutral', confidence: 0.9, triggers: [] }) }, finish_reason: 'stop' }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      let mockReplyContent = '';
      if (lastUserMsg.includes('小明') || lastUserMsg.includes('我叫')) {
        mockReplyContent = JSON.stringify({
          reasoning_deduction: { cognitive_distortion: '无', emotional_core: '中性', intervention_strategy: '提取称呼转入倾听' },
          retrieved_evidence: { used_framework: ['pre_info_collection'], retrieved_chunks: [] },
          state_machine: 'Pre_Info_Collection',
          pre_info_update: { user_name: '小明', collection_completed: true },
          ui_control: { color_theme: '#4FC3F7', lighting_style: 'soft_ambient' },
          agent_reply: '你好，小明！很高兴认识你。今天过得怎么样？'
        });
      } else if (sysMsg.includes('【用户信息】：用户称呼为「小明」') || lastUserMsg.includes('累')) {
        mockReplyContent = JSON.stringify({
          reasoning_deduction: { cognitive_distortion: '无', emotional_core: '疲惫', intervention_strategy: '共情陪伴' },
          retrieved_evidence: { used_framework: ['active_listening'], retrieved_chunks: [] },
          state_machine: 'Active_Listening',
          pre_info_update: { user_name: '小明', collection_completed: true },
          ui_control: { color_theme: '#4FC3F7', lighting_style: 'soft_ambient' },
          agent_reply: '小明，听到你觉得累，我感到很关心。要不要和我说说具体发生了什么？'
        });
      } else {
        mockReplyContent = JSON.stringify({
          reasoning_deduction: { cognitive_distortion: '无', emotional_core: '中性', intervention_strategy: '前置接待员引导' },
          retrieved_evidence: { used_framework: ['pre_info_collection'], retrieved_chunks: [] },
          state_machine: 'Pre_Info_Collection',
          pre_info_update: { user_name: null, collection_completed: false },
          ui_control: { color_theme: '#4FC3F7', lighting_style: 'soft_ambient' },
          agent_reply: '你好！我是你的心理支持伙伴。在正式开始对话前，请问我可以怎么称呼你呢？'
        });
      }

      return new Response(JSON.stringify({
        id: 'mock-chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Date.now(),
        model: 'google/gemini-2.5-flash',
        choices: [{ index: 0, message: { role: 'assistant', content: mockReplyContent }, finish_reason: 'stop' }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (mockErr) {
    console.error('[mockFetch Error]', mockErr);
  }

  return originalFetch(url, options);
};

async function main() {
  logHeader('RE-THINK Milestone M5 (Verification Suite & Automated Testing Scripts - R1..R4)');

  const indexModule = await import('../worker/src/index.ts');
  const app = indexModule.default || indexModule;

  const db = createMockD1Database();
  const mockEnv = {
    DB: db,
    API_KEY: 'mock_api_key_for_testing',
    FIREBASE_API_KEY: 'mock_firebase_key_for_testing',
    FIREBASE_PROJECT_ID: 'mock_project_id',
    OPENROUTER_API_KEY: 'mock_openrouter_key',
    DEFAULT_MODEL: 'google/gemini-2.5-flash',
  };

  const userId = 'm5_test_user_888';
  const token = `mock-token-${userId}`;
  const sessionId1 = 'session_m5_stage1_001';
  const sessionId2 = 'session_m5_stage3_002';

  // ============================================================
  // TEST CASE 1: R1 Conversational Pre-Info Collection
  // ============================================================
  console.log(`\n${colors.yellow}>>> Executing Test Case 1: Conversational Pre-Info Collection (R1)${colors.reset}`);

  const req1 = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId: sessionId1,
      messages: [{ role: 'user', content: '你好' }],
      stream: false,
    })
  }, mockEnv);

  if (req1.status !== 200) {
    const errText = await req1.text();
    throw new Error(`Test Case 1 failed with status ${req1.status}: ${errText}`);
  }

  const res1 = await req1.json();
  if (res1.fsmState !== 'Pre_Info_Collection') {
    throw new Error(`Test Case 1 failed: Expected fsmState Pre_Info_Collection, got ${res1.fsmState}`);
  }

  if (!res1.content.includes('称呼') && !res1.content.includes('名字')) {
    throw new Error(`Test Case 1 failed: Receptionist reply does not ask for user name. Got: ${res1.content}`);
  }

  logPass('Test Case 1 (R1)', 'Initial chat request starts in Pre_Info_Collection state with Receptionist greeting asking for user name.');

  // ============================================================
  // TEST CASE 2: R2 Smooth State Transition to Formal Counseling
  // ============================================================
  console.log(`\n${colors.yellow}>>> Executing Test Case 2: Smooth State Transition to Formal Counseling (R2)${colors.reset}`);

  const req2 = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId: sessionId1,
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: res1.content },
        { role: 'user', content: '我叫小明' }
      ],
      stream: false,
    })
  }, mockEnv);

  if (req2.status !== 200) {
    const errText = await req2.text();
    throw new Error(`Test Case 2 failed with status ${req2.status}: ${errText}`);
  }

  const res2 = await req2.json();

  // Verify memory persistence in D1
  const storedName = await MemoryService.getLatestMemory(db, userId, 'user_name');
  if (storedName !== '小明') {
    throw new Error(`Test Case 2 failed: Expected D1 memory '小明', got '${storedName}'`);
  }

  // Verify FSM transition to Active_Listening
  if (res2.fsmState !== 'Active_Listening') {
    throw new Error(`Test Case 2 failed: Expected transition to Active_Listening, got ${res2.fsmState}`);
  }

  // Verify CBT System Prompt name addressing
  const mockFSMContext = {
    currentState: 'Active_Listening',
    turnCount: 2,
    profileCollected: false,
    abcCompleted: false,
    restructureAccepted: false,
    emotionalStreak: 0,
    icebreaker: { layer: 1, coreBeliefs: [], observations: [] },
    preInfo: { userName: '小明', collectionCompleted: true }
  };
  const prompt = buildSystemPromptFSM('Active_Listening', 'emotional', undefined, undefined, undefined, undefined, mockFSMContext.preInfo);
  if (!prompt.includes('【用户信息】：用户称呼为「小明」。')) {
    throw new Error(`Test Case 2 failed: System prompt missing user name addressing instruction.`);
  }

  if (!res2.content.includes('小明')) {
    throw new Error(`Test Case 2 failed: Assistant response did not address user by name '小明'. Got: ${res2.content}`);
  }

  logPass('Test Case 2 (R2)', "User name '小明' saved to D1 user_memories, FSM transitioned to Active_Listening, and CBT system prompt injects user name.");

  // ============================================================
  // TEST CASE 3: R3 Cross-Session Memory Persistence & Deletion Sync
  // ============================================================
  console.log(`\n${colors.yellow}>>> Executing Test Case 3: Cross-Session Memory Persistence & Deletion Sync (R3)${colors.reset}`);

  const req3 = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId: sessionId2,
      messages: [{ role: 'user', content: '我最近感觉有点累' }],
      stream: false,
    })
  }, mockEnv);

  if (req3.status !== 200) {
    const errText = await req3.text();
    throw new Error(`Test Case 3 failed with status ${req3.status}: ${errText}`);
  }

  const res3 = await req3.json();

  if (res3.fsmState !== 'Active_Listening') {
    throw new Error(`Test Case 3 failed: Expected initial state to inherit Active_Listening, got ${res3.fsmState}`);
  }

  // Verify memory inheritance in D1 session context
  const session2Row = db.sessionsStore.find(s => s.id === sessionId2);
  if (!session2Row) {
    throw new Error(`Test Case 3 failed: Session 2 not saved to D1.`);
  }
  const session2Context = JSON.parse(session2Row.fsm_context);
  if (session2Context.preInfo?.userName !== '小明' || !session2Context.preInfo?.fromMemory) {
    throw new Error(`Test Case 3 failed: Session 2 context missing inherited memory flag or userName.`);
  }

  // Delete Session 1 via DELETE /api/auth/sessions/:id
  const delReq = await app.request(`/api/auth/sessions/${sessionId1}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, mockEnv);

  if (delReq.status !== 200) {
    const errText = await delReq.text();
    throw new Error(`Test Case 3 failed: Session deletion returned status ${delReq.status}: ${errText}`);
  }

  const delRes = await delReq.json();
  if (!delRes.success) {
    throw new Error(`Test Case 3 failed: Session deletion returned success: false`);
  }

  // Verify zero orphaned records for session 1 in user_memories D1 table
  const orphanedMemories = db.memoriesStore.filter(m => m.session_id === sessionId1);
  if (orphanedMemories.length > 0) {
    throw new Error(`Test Case 3 failed: Found ${orphanedMemories.length} orphaned memory records for deleted session ${sessionId1}`);
  }

  // Verify session 1 is removed from sessions table
  const deletedSessionRow = db.sessionsStore.find(s => s.id === sessionId1);
  if (deletedSessionRow) {
    throw new Error(`Test Case 3 failed: Session ${sessionId1} still exists in sessions table`);
  }

  // Fallback verification: delete session 2 as well, verify starting session 3 falls back to Pre_Info_Collection
  await app.request(`/api/auth/sessions/${sessionId2}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  }, mockEnv);

  const sessionId3 = 'session_m5_fallback_003';
  const reqFallback = await app.request('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      sessionId: sessionId3,
      messages: [{ role: 'user', content: '你好' }],
      stream: false,
    })
  }, mockEnv);

  const resFallback = await reqFallback.json();
  if (resFallback.fsmState !== 'Pre_Info_Collection') {
    throw new Error(`Test Case 3 failed: Expected fallback to Pre_Info_Collection after all session memories cleared, got ${resFallback.fsmState}`);
  }

  logPass('Test Case 3 (R3)', 'Cross-session memory inherited in Session 2, and DELETE /api/auth/sessions/:id clean-cleared user_memories with zero orphaned records.');

  // ============================================================
  // TEST CASE 4: R4 Greeting Diversity & Prohibited Word Assertion
  // ============================================================
  console.log(`\n${colors.yellow}>>> Executing Test Case 4: Greeting Diversity & Prohibited Word Assertion (R4)${colors.reset}`);

  // 1. Verify candidate greetings in RECEPTIONIST_GREETING_CANDIDATES exhibit diversity
  if (!RECEPTIONIST_GREETING_CANDIDATES || RECEPTIONIST_GREETING_CANDIDATES.length < 5) {
    throw new Error(`Test Case 4 failed: RECEPTIONIST_GREETING_CANDIDATES length is < 5`);
  }

  const sampledGreetings = new Set();
  for (let i = 0; i < 50; i++) {
    sampledGreetings.add(getRandomReceptionistGreeting());
  }
  if (sampledGreetings.size < 2) {
    throw new Error(`Test Case 4 failed: Receptionist greeting random distribution lacks diversity.`);
  }

  // 2. Assert zero occurrence of "卧槽" or vulgar slang in candidates & LLM prompts across all FSM states
  for (const candidate of RECEPTIONIST_GREETING_CANDIDATES) {
    if (containsProhibitedWords(candidate) || candidate.includes('卧槽')) {
      throw new Error(`Test Case 4 failed: Prohibited word '卧槽' found in greeting candidate: "${candidate}"`);
    }
  }

  const allStates = ['Pre_Info_Collection', 'Onboarding', 'Active_Listening', 'CBT_Stripping', 'Socratic_Questioning', 'Crisis_Escalation'];
  for (const state of allStates) {
    const prompt = buildSystemPromptFSM(state, 'casual');
    if (containsProhibitedWords(prompt) || prompt.includes('卧槽')) {
      throw new Error(`Test Case 4 failed: Prohibited word '卧槽' found in system prompt for state ${state}`);
    }
  }

  // 3. Verify sanitizeResponse and getEmittableAndBuffer filter prohibited words in responses and streaming chunks
  const dirtyInput = '今天天气挺好，但是卧槽也太倒霉了！';
  const cleanResult = sanitizeResponse(dirtyInput);
  if (cleanResult.includes('卧槽') || containsProhibitedWords(cleanResult)) {
    throw new Error(`Test Case 4 failed: sanitizeResponse failed to filter prohibited word '卧槽'. Got: ${cleanResult}`);
  }

  // Verify split-chunk boundary streaming sanitizer
  const chunk1 = '今天天气挺好，但是卧';
  const chunk2 = '槽也太倒霉了';
  const res1Chunk = getEmittableAndBuffer(sanitizeResponse(chunk1), false);
  const res2Chunk = getEmittableAndBuffer(sanitizeResponse(res1Chunk.buffer + chunk2), true);
  const reconstructed = res1Chunk.emittable + res2Chunk.emittable;

  if (reconstructed.includes('卧槽') || containsProhibitedWords(reconstructed)) {
    throw new Error(`Test Case 4 failed: Split-chunk sanitizer failed to filter '卧槽' across stream boundary. Got: ${reconstructed}`);
  }

  logPass('Test Case 4 (R4)', 'Greeting diversity verified (>= 5 candidate pool with random carousel distribution) and zero occurrence of "卧槽"/vulgar words asserted in LLM prompts, candidate greetings, and SSE streaming responses.');

  console.log(`\n${colors.bold}${colors.green}ALL 4 TEST CASES (R1..R4) PASSED WITH 100% SUCCESS RATE!${colors.reset}\n`);
}

main().catch(err => {
  logFail('FATAL', err.stack || err.message);
  process.exit(1);
});
