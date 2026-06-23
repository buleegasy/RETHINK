-- 创建问卷调查数据表
-- 执行：wrangler d1 execute re-think-sessions --file=./migrations/0004_surveys.sql

CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,           -- JSON 格式存储完整答题记录
  open_feedback TEXT NOT NULL DEFAULT '', -- 用户的开放建议
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
