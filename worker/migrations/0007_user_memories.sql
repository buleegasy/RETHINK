-- D1 Migration: Decoupled Cross-Session User Memories (R3)
CREATE TABLE IF NOT EXISTS user_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_session ON user_memories(session_id);
