-- 知识库分块镜像表
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  document_title TEXT NOT NULL,
  heading_path TEXT DEFAULT '',
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- 为全文检索/模糊查询加速创建索引
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_document_id ON knowledge_chunks(document_id);
