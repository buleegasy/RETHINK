import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryService } from '../lib/memory';
import { createDefaultContext, type FSMContext } from '../lib/fsm';
import { applyPreInfoUpdate } from '../routes/chat';
import { buildSystemPromptFSM } from '../lib/llm';

// Mock D1 Database for cross-session empirical test suite
function createMockD1ForCrossSession() {
  const memoriesStore: Array<{
    id: string;
    user_id: string;
    session_id: string;
    memory_key: string;
    memory_value: string;
    created_at: number;
  }> = [];

  let timeOffset = 0;

  return {
    memoriesStore,
    prepare: (sql: string) => {
      return {
        bind: (...args: any[]) => {
          return {
            run: async () => {
              if (sql.includes('INSERT INTO user_memories')) {
                const [id, user_id, session_id, memory_key, memory_value] = args;
                timeOffset += 100;
                memoriesStore.push({
                  id,
                  user_id,
                  session_id,
                  memory_key,
                  memory_value,
                  created_at: Date.now() + timeOffset,
                });
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM user_memories')) {
                const [session_id] = args;
                const before = memoriesStore.length;
                for (let i = memoriesStore.length - 1; i >= 0; i--) {
                  if (memoriesStore[i].session_id === session_id) {
                    memoriesStore.splice(i, 1);
                  }
                }
                return { meta: { changes: before - memoriesStore.length } };
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
              return null;
            },
          };
        },
      };
    },
  } as any;
}

describe('Empirical Verification: Cross-Session Memory & State Transitions (M3)', () => {
  let db: ReturnType<typeof createMockD1ForCrossSession>;

  beforeEach(() => {
    db = createMockD1ForCrossSession();
  });

  describe('1. Cross-Session Retrieval & Automated FSM State Transition', () => {
    it('automatically transitions FSM state from Pre_Info_Collection to Active_Listening when memory exists', async () => {
      const userId = 'user_001';
      const sessionIdA = 'session_alpha';
      const sessionIdB = 'session_beta';

      // 1. Session A: User provides name '小星'
      await MemoryService.saveMemory(db, userId, sessionIdA, 'user_name', '小星');

      // 2. Session B: New session started by user_001
      let fsmCtx: FSMContext = createDefaultContext();
      expect(fsmCtx.currentState).toBe('Pre_Info_Collection');
      expect(fsmCtx.preInfo.collectionCompleted).toBe(false);

      // Simulate chatRouter section 1.2 cross-session memory loading
      const rememberedName = await MemoryService.getLatestMemory(db, userId, 'user_name');
      expect(rememberedName).toBe('小星');

      if (rememberedName) {
        fsmCtx.preInfo = {
          userName: rememberedName,
          collectionCompleted: true,
          fromMemory: true,
        };
        if (fsmCtx.currentState === 'Pre_Info_Collection') {
          fsmCtx.currentState = 'Active_Listening';
        }
      }

      // Assertions on state transitions
      expect(fsmCtx.currentState).toBe('Active_Listening');
      expect(fsmCtx.preInfo.userName).toBe('小星');
      expect(fsmCtx.preInfo.collectionCompleted).toBe(true);
      expect(fsmCtx.preInfo.fromMemory).toBe(true);
    });

    it('injects remembered userName into counseling system prompt when loaded from memory', async () => {
      const fsmCtx: FSMContext = {
        ...createDefaultContext(),
        currentState: 'Active_Listening',
        preInfo: {
          userName: '小星',
          collectionCompleted: true,
          fromMemory: true,
        },
      };

      const systemPrompt = buildSystemPromptFSM(
        fsmCtx.currentState,
        'academic_stress',
        undefined,
        undefined,
        undefined,
        undefined,
        fsmCtx.preInfo
      );

      expect(systemPrompt).toContain('【用户信息】：用户称呼为「小星」。在后续对话中自然使用此称呼。');
      expect(systemPrompt).not.toContain('OUTPUT_FORMAT_PRE_INFO');
    });

    it('remains in Pre_Info_Collection when no cross-session memory exists', async () => {
      const userId = 'new_user_999';
      let fsmCtx: FSMContext = createDefaultContext();

      const rememberedName = await MemoryService.getLatestMemory(db, userId, 'user_name');
      expect(rememberedName).toBeNull();

      if (rememberedName) {
        fsmCtx.preInfo = {
          userName: rememberedName,
          collectionCompleted: true,
          fromMemory: true,
        };
        if (fsmCtx.currentState === 'Pre_Info_Collection') {
          fsmCtx.currentState = 'Active_Listening';
        }
      }

      expect(fsmCtx.currentState).toBe('Pre_Info_Collection');
      expect(fsmCtx.preInfo.collectionCompleted).toBe(false);
      expect(fsmCtx.preInfo.userName).toBeUndefined();
    });
  });

  describe('2. Memory Overriding & Real-Time Sync', () => {
    it('updates latest memory when user changes name in a subsequent session', async () => {
      const userId = 'user_002';

      // First name in Session 1
      await MemoryService.saveMemory(db, userId, 'session_1', 'user_name', '小乐');
      let currentMemory = await MemoryService.getLatestMemory(db, userId, 'user_name');
      expect(currentMemory).toBe('小乐');

      // Updated name in Session 2
      await MemoryService.saveMemory(db, userId, 'session_2', 'user_name', '阿乐');
      currentMemory = await MemoryService.getLatestMemory(db, userId, 'user_name');
      expect(currentMemory).toBe('阿乐');
    });

    it('clears fromMemory flag when user explicitly updates pre_info in current session', () => {
      const initial = {
        userName: '小乐',
        collectionCompleted: true,
        fromMemory: true,
      };

      const updated = applyPreInfoUpdate(initial, { user_name: '阿乐' });

      expect(updated.userName).toBe('阿乐');
      expect(updated.fromMemory).toBeUndefined();
      expect(updated.collectionCompleted).toBe(true);
    });

    it('ignores empty/whitespace name updates in applyPreInfoUpdate', () => {
      const initial = {
        userName: '小乐',
        collectionCompleted: true,
        fromMemory: true,
      };

      const updated = applyPreInfoUpdate(initial, { user_name: '   ' });

      expect(updated.userName).toBe('小乐');
      expect(updated.fromMemory).toBe(true);
    });
  });

  describe('3. Deletion Sync & Lifecycle Decoupling', () => {
    it('restores previous memory state when the session containing the newest memory is deleted', async () => {
      const userId = 'user_003';

      // Session A memory created first
      await MemoryService.saveMemory(db, userId, 'session_a', 'user_name', '旧名字');

      // Session B memory created later
      await MemoryService.saveMemory(db, userId, 'session_b', 'user_name', '新名字');

      expect(await MemoryService.getLatestMemory(db, userId, 'user_name')).toBe('新名字');

      // User deletes Session B
      await MemoryService.deleteMemoriesBySessionId(db, 'session_b');

      // Latest memory should fall back to Session A ('旧名字')
      const fallbackMemory = await MemoryService.getLatestMemory(db, userId, 'user_name');
      expect(fallbackMemory).toBe('旧名字');
    });

    it('resets new sessions to Pre_Info_Collection if all previous sessions are deleted', async () => {
      const userId = 'user_004';

      await MemoryService.saveMemory(db, userId, 'session_only', 'user_name', '临时名');
      expect(await MemoryService.getLatestMemory(db, userId, 'user_name')).toBe('临时名');

      // User deletes only session
      await MemoryService.deleteMemoriesBySessionId(db, 'session_only');
      expect(await MemoryService.getLatestMemory(db, userId, 'user_name')).toBeNull();

      // Next new session
      let fsmCtx: FSMContext = createDefaultContext();
      const rememberedName = await MemoryService.getLatestMemory(db, userId, 'user_name');

      if (rememberedName) {
        fsmCtx.preInfo = {
          userName: rememberedName,
          collectionCompleted: true,
          fromMemory: true,
        };
        if (fsmCtx.currentState === 'Pre_Info_Collection') {
          fsmCtx.currentState = 'Active_Listening';
        }
      }

      expect(fsmCtx.currentState).toBe('Pre_Info_Collection');
      expect(fsmCtx.preInfo.collectionCompleted).toBe(false);
    });
  });
});
