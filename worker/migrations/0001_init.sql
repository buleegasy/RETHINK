-- RE-THINK Agent D1 数据库初始化迁移
-- 执行：wrangler d1 execute re-think-sessions --file=./migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '新对话',
  messages TEXT NOT NULL DEFAULT '[]',  -- JSON 字符串，存储消息数组
  current_stage INTEGER NOT NULL DEFAULT 1,  -- 当前 CBT 阶段 (1-5)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
