import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { MemoryService } from '../lib/memory';
import { buildSystemPromptFSM } from '../lib/llm';
import {
  RECEPTIONIST_GREETING_CANDIDATES,
  getRandomReceptionistGreeting,
  createDefaultContext,
} from '../lib/fsm';
import {
  sanitizeResponse,
  getEmittableAndBuffer,
  containsProhibitedWords,
} from '../lib/sanitizer';

function createMockD1Database() {
  const sessionsStore: any[] = [];
  const memoriesStore: any[] = [];
  let seq = 0;

  return {
    sessionsStore,
    memoriesStore,
    prepare: (sql: string) => ({
      bind: (...args: any[]) => ({
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
        first: async <T>() => {
          if (sql.includes('SELECT memory_value FROM user_memories')) {
            const [user_id, memory_key] = args;
            const matches = memoriesStore
              .filter(m => m.user_id === user_id && m.memory_key === memory_key)
              .sort((a, b) => b.created_at - a.created_at);
            return (matches[0] ? { memory_value: matches[0].memory_value } : null) as T;
          }
          if (sql.includes('SELECT * FROM sessions WHERE id = ?')) {
            const [id] = args;
            return (sessionsStore.find(s => s.id === id) || null) as T;
          }
          if (sql.includes('SELECT id, user_id FROM sessions WHERE id = ?')) {
            const [id] = args;
            const match = sessionsStore.find(s => s.id === id);
            return (match ? { id: match.id, user_id: match.user_id } : null) as T;
          }
          return null;
        },
        all: async <T>() => {
          if (sql.includes('FROM user_memories WHERE session_id = ?')) {
            const [sessionId] = args;
            return { results: memoriesStore.filter(m => m.session_id === sessionId) } as T;
          }
          if (sql.includes('FROM sessions WHERE user_id = ?')) {
            const [user_id] = args;
            return { results: sessionsStore.filter(s => s.user_id === user_id) } as T;
          }
          return { results: [] } as T;
        }
      })
    })
  } as any;
}

describe('Milestone M5 Verification Suite (R1..R4 End-to-End)', () => {
  let db: ReturnType<typeof createMockD1Database>;
  const mockEnv = {
    FIREBASE_API_KEY: 'mock_firebase_key_for_testing',
    FIREBASE_PROJECT_ID: 'mock_project_id',
    OPENROUTER_API_KEY: 'mock_openrouter_key',
    DEFAULT_MODEL: 'google/gemini-2.5-flash',
  };

  beforeEach(() => {
    db = createMockD1Database();
  });

  it('Test Case 1 — R1 Conversational Pre-Info Collection', async () => {
    const ctx = createDefaultContext();
    expect(ctx.currentState).toBe('Pre_Info_Collection');
    expect(ctx.preInfo.collectionCompleted).toBe(false);

    const prompt = buildSystemPromptFSM('Pre_Info_Collection', 'casual');
    expect(prompt).toContain('前台接待员');
    expect(prompt).toContain('pre_info_update');
    expect(prompt).not.toContain('【用户信息】：用户称呼为');
  });

  it('Test Case 2 — R2 Smooth State Transition to Formal Counseling', async () => {
    const userId = 'm5_user_r2';
    const sessionId = 'session_r2';

    await MemoryService.saveMemory(db, userId, sessionId, 'user_name', '小明');

    const storedName = await MemoryService.getLatestMemory(db, userId, 'user_name');
    expect(storedName).toBe('小明');

    const preInfo = { userName: '小明', collectionCompleted: true };
    const prompt = buildSystemPromptFSM('Active_Listening', 'emotional', undefined, undefined, undefined, undefined, preInfo);
    expect(prompt).toContain('【用户信息】：用户称呼为「小明」。在后续对话中自然使用此称呼。');
  });

  it('Test Case 3 — R3 Cross-Session Memory Persistence & Deletion Sync', async () => {
    const userId = 'm5_user_r3';
    const sessionId1 = 'session_r3_1';
    const sessionId2 = 'session_r3_2';

    // 1. Save memory in Session 1
    await MemoryService.saveMemory(db, userId, sessionId1, 'user_name', '小华');

    // 2. Query memory in Session 2
    const inheritedName = await MemoryService.getLatestMemory(db, userId, 'user_name');
    expect(inheritedName).toBe('小华');

    // 3. Delete Session 1 and verify user_memories clean-cleared
    const deletedCount = await MemoryService.deleteMemoriesBySessionId(db, sessionId1);
    expect(deletedCount).toBe(1);

    const checkMemories = db.memoriesStore.filter((m: any) => m.session_id === sessionId1);
    expect(checkMemories.length).toBe(0);

    const emptyMemory = await MemoryService.getLatestMemory(db, userId, 'user_name');
    expect(emptyMemory).toBeNull();
  });

  it('Test Case 4 — R4 Greeting Diversity & Prohibited Word Assertion', () => {
    // 1. Greeting diversity
    expect(RECEPTIONIST_GREETING_CANDIDATES.length).toBeGreaterThanOrEqual(5);

    const samples = new Set();
    for (let i = 0; i < 50; i++) {
      samples.add(getRandomReceptionistGreeting());
    }
    expect(samples.size).toBeGreaterThanOrEqual(2);

    // 2. Prohibited word filter in greetings and system prompts
    for (const greeting of RECEPTIONIST_GREETING_CANDIDATES) {
      expect(containsProhibitedWords(greeting)).toBe(false);
      expect(greeting.includes('卧槽')).toBe(false);
    }

    const allStates = ['Pre_Info_Collection', 'Onboarding', 'Active_Listening', 'CBT_Stripping', 'Socratic_Questioning', 'Crisis_Escalation'] as const;
    for (const state of allStates) {
      const prompt = buildSystemPromptFSM(state, 'casual');
      expect(containsProhibitedWords(prompt)).toBe(false);
      expect(prompt.includes('卧槽')).toBe(false);
    }

    // 3. Sanitizer and streaming chunk boundary filtering
    const dirty = '天气很好，但是卧槽太倒霉了';
    const clean = sanitizeResponse(dirty);
    expect(clean.includes('卧槽')).toBe(false);

    const chunk1 = '今天天气挺好，但是卧';
    const chunk2 = '槽也太倒霉了';
    const res1 = getEmittableAndBuffer(sanitizeResponse(chunk1), false);
    const res2 = getEmittableAndBuffer(sanitizeResponse(res1.buffer + chunk2), true);
    const resultText = res1.emittable + res2.emittable;
    expect(resultText.includes('卧槽')).toBe(false);
  });
});
