import { describe, it, expect, beforeEach } from 'vitest';
import app from '../index';
import { MemoryService } from '../lib/memory';

const MOCK_ENV = {
  FIREBASE_API_KEY: 'mock_firebase_key_for_testing',
  FIREBASE_PROJECT_ID: 'mock_project_id',
};

// Enhanced Mock D1 for full Auth Router + MemoryService empirical verification
function createMockD1ForVerification() {
  const sessionsStore: Array<{
    id: string;
    user_id: string;
    title: string;
    created_at: number;
    updated_at: number;
  }> = [];

  const memoriesStore: Array<{
    id: string;
    user_id: string;
    session_id: string;
    memory_key: string;
    memory_value: string;
    created_at: number;
  }> = [];

  let offset = 0;

  return {
    sessionsStore,
    memoriesStore,
    prepare: (sql: string) => {
      return {
        bind: (...args: any[]) => {
          return {
            run: async () => {
              if (sql.includes('INSERT INTO user_memories')) {
                const [id, user_id, session_id, memory_key, memory_value] = args;
                offset += 10;
                memoriesStore.push({
                  id,
                  user_id,
                  session_id,
                  memory_key,
                  memory_value,
                  created_at: Date.now() + offset,
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
              if (sql.includes('DELETE FROM sessions WHERE id = ?')) {
                const [sessionId] = args;
                const before = sessionsStore.length;
                for (let i = sessionsStore.length - 1; i >= 0; i--) {
                  if (sessionsStore[i].id === sessionId) {
                    sessionsStore.splice(i, 1);
                  }
                }
                return { meta: { changes: before - sessionsStore.length } };
              }
              return { meta: { changes: 0 } };
            },
            first: async <T>() => {
              if (sql.includes('SELECT id, user_id FROM sessions WHERE id = ?')) {
                const [sessionId] = args;
                const match = sessionsStore.find(s => s.id === sessionId);
                return (match ? { id: match.id, user_id: match.user_id } : null) as T;
              }
              if (sql.includes('SELECT memory_value FROM user_memories')) {
                const [user_id, memory_key] = args;
                const matches = memoriesStore
                  .filter(m => m.user_id === user_id && m.memory_key === memory_key)
                  .sort((a, b) => b.created_at - a.created_at);
                return (matches[0] ? { memory_value: matches[0].memory_value } : null) as T;
              }
              return null;
            },
            all: async <T>() => {
              if (sql.includes('FROM user_memories WHERE session_id = ?')) {
                const [sessionId] = args;
                const matches = memoriesStore.filter(m => m.session_id === sessionId);
                return { results: matches } as T;
              }
              return { results: [] } as T;
            },
          };
        },
      };
    },
  } as any;
}

describe('Empirical Verification: Deletion Synchronization & Memory Isolation (M3)', () => {
  let db: ReturnType<typeof createMockD1ForVerification>;

  beforeEach(() => {
    db = createMockD1ForVerification();
  });

  describe('1. MemoryService.deleteMemoriesBySessionId Empirical Assertions', () => {
    it('removes all associated user_memories records tied to session_id', async () => {
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'user_name', '小明');
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'preferred_tone', 'gentle');
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'primary_concern', 'academic_stress');

      expect(db.memoriesStore.length).toBe(3);

      const deletedCount = await MemoryService.deleteMemoriesBySessionId(db, 'session_a');
      expect(deletedCount).toBe(3);
      expect(db.memoriesStore.length).toBe(0);
    });

    it('deleting session A does NOT delete memories belonging to session B', async () => {
      // Session A memory
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'user_name', '小明');

      // Session B memory created independently
      await MemoryService.saveMemory(db, 'user_1', 'session_b', 'user_name', '小华');
      await MemoryService.saveMemory(db, 'user_1', 'session_b', 'hobby', 'painting');

      expect(db.memoriesStore.length).toBe(3);

      // Delete session A
      const deletedCount = await MemoryService.deleteMemoriesBySessionId(db, 'session_a');
      expect(deletedCount).toBe(1);

      // Session B memories must be preserved intact
      expect(db.memoriesStore.length).toBe(2);
      const sessionBMemories = db.memoriesStore.filter((m: any) => m.session_id === 'session_b');
      expect(sessionBMemories.length).toBe(2);

      // Latest memory for user_1 should be from session B ('小华')
      const latestName = await MemoryService.getLatestMemory(db, 'user_1', 'user_name');
      expect(latestName).toBe('小华');
    });

    it('deleting session A leaves zero orphaned rows in D1 user_memories', async () => {
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'user_name', '小明');
      await MemoryService.saveMemory(db, 'user_2', 'session_c', 'user_name', '张伟');

      await MemoryService.deleteMemoriesBySessionId(db, 'session_a');

      // Check session_a rows in memories store
      const orphanedRows = db.memoriesStore.filter((m: any) => m.session_id === 'session_a');
      expect(orphanedRows.length).toBe(0);

      // Verify overall DB state (only session_c remains)
      expect(db.memoriesStore.length).toBe(1);
      expect(db.memoriesStore[0].session_id).toBe('session_c');
    });
  });

  describe('2. HTTP DELETE /api/auth/sessions/:id End-to-End Route Verification', () => {
    it('successfully cleans up session and associated memories via HTTP DELETE endpoint', async () => {
      const token = 'mock-token-user_1';

      // Seed sessions table
      db.sessionsStore.push({
        id: 'session_a',
        user_id: 'user_1',
        title: 'Session A Title',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      // Seed memories table
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'user_name', '小明');
      await MemoryService.saveMemory(db, 'user_1', 'session_a', 'age', '16');

      expect(db.sessionsStore.length).toBe(1);
      expect(db.memoriesStore.length).toBe(2);

      const res = await app.request('/api/auth/sessions/session_a', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, {
        DB: db,
        ...MOCK_ENV,
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);

      // Verify session removed from sessions table
      expect(db.sessionsStore.find((s: any) => s.id === 'session_a')).toBeUndefined();

      // Verify zero orphaned memory rows for session_a
      const orphanedMemories = db.memoriesStore.filter((m: any) => m.session_id === 'session_a');
      expect(orphanedMemories.length).toBe(0);
    });

    it('prevents forbidden session deletion when deleting session belonging to another user', async () => {
      const user1Token = 'mock-token-user_1';

      // Session B belongs to user_2
      db.sessionsStore.push({
        id: 'session_b',
        user_id: 'user_2',
        title: 'User 2 Session',
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      await MemoryService.saveMemory(db, 'user_2', 'session_b', 'user_name', 'User2Name');

      // User 1 attempts to delete User 2's session
      const res = await app.request('/api/auth/sessions/session_b', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user1Token}`,
        },
      }, {
        DB: db,
        ...MOCK_ENV,
      });

      expect(res.status).toBe(403);
      const json = await res.json() as any;
      expect(json.error).toBe('Forbidden');

      // Verify session & memory records were NOT deleted
      expect(db.sessionsStore.length).toBe(1);
      expect(db.memoriesStore.length).toBe(1);
    });

    it('handles non-existent session deletion gracefully without side effects', async () => {
      const token = 'mock-token-user_1';

      await MemoryService.saveMemory(db, 'user_1', 'session_b', 'user_name', 'ExistingName');

      const res = await app.request('/api/auth/sessions/non_existent_session', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }, {
        DB: db,
        ...MOCK_ENV,
      });

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(db.memoriesStore.length).toBe(1);
    });
  });
});
