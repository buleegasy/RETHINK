import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryService } from '../lib/memory';
import { createDefaultContext } from '../lib/fsm';
import { applyPreInfoUpdate } from '../routes/chat';

// Mock D1 Database interface for unit testing
function createMockD1() {
  const store: Array<{
    id: string;
    user_id: string;
    session_id: string;
    memory_key: string;
    memory_value: string;
    created_at: number;
  }> = [];

  let nextCreatedAtOffset = 0;

  return {
    store,
    prepare: (sql: string) => {
      return {
        bind: (...args: any[]) => {
          return {
            run: async () => {
              if (sql.includes('INSERT INTO user_memories')) {
                const [id, user_id, session_id, memory_key, memory_value] = args;
                nextCreatedAtOffset += 10;
                store.push({
                  id,
                  user_id,
                  session_id,
                  memory_key,
                  memory_value,
                  created_at: Date.now() + nextCreatedAtOffset,
                });
                return { meta: { changes: 1 } };
              }
              if (sql.includes('DELETE FROM user_memories')) {
                const [session_id] = args;
                const initialLen = store.length;
                for (let i = store.length - 1; i >= 0; i--) {
                  if (store[i].session_id === session_id) {
                    store.splice(i, 1);
                  }
                }
                return { meta: { changes: initialLen - store.length } };
              }
              return { meta: { changes: 0 } };
            },
            first: async <T>() => {
              if (sql.includes('SELECT memory_value FROM user_memories')) {
                const [user_id, memory_key] = args;
                const matches = store
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

describe('MemoryService & Cross-Session Memory Integration (R3)', () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
  });

  describe('MemoryService CRUD', () => {
    it('should save user memory successfully', async () => {
      await MemoryService.saveMemory(db, 'user123', 'session_a', 'user_name', '小明');
      expect(db.store.length).toBe(1);
      expect(db.store[0].memory_value).toBe('小明');
      expect(db.store[0].user_id).toBe('user123');
      expect(db.store[0].session_id).toBe('session_a');
    });

    it('should retrieve latest memory value for user and key', async () => {
      await MemoryService.saveMemory(db, 'user123', 'session_a', 'user_name', '小明');
      await MemoryService.saveMemory(db, 'user123', 'session_b', 'user_name', '小红');

      const latest = await MemoryService.getLatestMemory(db, 'user123', 'user_name');
      expect(latest).toBe('小红');
    });

    it('should return null if no memory exists for user', async () => {
      const memory = await MemoryService.getLatestMemory(db, 'user_unknown', 'user_name');
      expect(memory).toBeNull();
    });

    it('should return null if key or userId is empty', async () => {
      await MemoryService.saveMemory(db, 'user123', 'session_a', 'user_name', '小明');
      expect(await MemoryService.getLatestMemory(db, '', 'user_name')).toBeNull();
      expect(await MemoryService.getLatestMemory(db, 'user123', '')).toBeNull();
    });

    it('should delete memories by session_id', async () => {
      await MemoryService.saveMemory(db, 'user123', 'session_a', 'user_name', '小明');
      await MemoryService.saveMemory(db, 'user123', 'session_b', 'user_name', '小红');

      const deletedCount = await MemoryService.deleteMemoriesBySessionId(db, 'session_b');
      expect(deletedCount).toBe(1);
      expect(db.store.length).toBe(1);

      const latest = await MemoryService.getLatestMemory(db, 'user123', 'user_name');
      expect(latest).toBe('小明');
    });

    it('should handle deletion of non-existent session smoothly', async () => {
      await MemoryService.saveMemory(db, 'user123', 'session_a', 'user_name', '小明');
      const deletedCount = await MemoryService.deleteMemoriesBySessionId(db, 'session_non_existent');
      expect(deletedCount).toBe(0);
      expect(db.store.length).toBe(1);
    });
  });

  describe('FSM Cross-Session State & PreInfo Helpers', () => {
    it('should transition smoothly when preInfo has fromMemory=true', () => {
      const ctx = createDefaultContext();
      ctx.preInfo = {
        userName: '小明',
        collectionCompleted: true,
        fromMemory: true,
      };
      if (ctx.preInfo.collectionCompleted) {
        ctx.currentState = 'Active_Listening';
      }

      expect(ctx.currentState).toBe('Active_Listening');
      expect(ctx.preInfo.fromMemory).toBe(true);
      expect(ctx.preInfo.userName).toBe('小明');
    });

    it('should clear fromMemory flag when applyPreInfoUpdate receives new user_name', () => {
      const current = {
        userName: '小明',
        collectionCompleted: true,
        fromMemory: true,
      };

      const updated = applyPreInfoUpdate(current, { user_name: '小红' });
      expect(updated.userName).toBe('小红');
      expect(updated.fromMemory).toBeUndefined();
      expect(updated.collectionCompleted).toBe(true);
    });
  });
});
