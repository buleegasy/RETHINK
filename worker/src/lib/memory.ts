import type { D1Database } from '@cloudflare/workers-types';

export interface UserMemoryRow {
  id: string;
  user_id: string;
  session_id: string;
  memory_key: string;
  memory_value: string;
  created_at: number;
}

/**
 * Decoupled Cross-Session Memory Service (R3 Requirement)
 */
export class MemoryService {
  /**
   * Save a memory record for a user and session
   */
  static async saveMemory(
    db: D1Database,
    userId: string,
    sessionId: string,
    key: string,
    value: string
  ): Promise<void> {
    if (!userId || !sessionId || !key || !value) return;
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO user_memories (id, user_id, session_id, memory_key, memory_value, created_at)
         VALUES (?, ?, ?, ?, ?, unixepoch())`
      )
      .bind(id, userId, sessionId, key, value)
      .run();
  }

  /**
   * Retrieve the most recent memory value for a user and key
   */
  static async getLatestMemory(
    db: D1Database,
    userId: string,
    key: string
  ): Promise<string | null> {
    if (!userId || !key) return null;

    const record = await db
      .prepare(
        `SELECT memory_value FROM user_memories 
         WHERE user_id = ? AND memory_key = ? 
         ORDER BY created_at DESC, rowid DESC 
         LIMIT 1`
      )
      .bind(userId, key)
      .first<{ memory_value: string }>();

    return record?.memory_value ?? null;
  }

  /**
   * Clean-clear associated user memories when a session is deleted
   */
  static async deleteMemoriesBySessionId(
    db: D1Database,
    sessionId: string
  ): Promise<number> {
    if (!sessionId) return 0;

    const res = await db
      .prepare(`DELETE FROM user_memories WHERE session_id = ?`)
      .bind(sessionId)
      .run();

    return res.meta?.changes ?? 0;
  }
}
