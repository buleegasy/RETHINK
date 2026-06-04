/**
 * RAG 核心模块 — 检索增强生成
 * 
 * 使用 Cloudflare Workers AI (BGE-M3) 生成 embedding，
 * 使用 Cloudflare Vectorize 存储和检索向量。
 */

import type { Env } from '../types';
import { chunkDocument, type DocumentChunk, type ChunkOptions } from './chunker';

// ============================================================
// 类型定义
// ============================================================

export interface RAGContext {
  chunks: string[];           // 检索到的知识片段文本
  scores: number[];           // 对应的相似度分数
  sourceDocuments: string[];  // 来源文档名
  chunkIds: string[];         // chunk ID 列表
}

export interface DocumentMetadata {
  title: string;
  sourceFile?: string;
}

interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

// BGE-M3 模型标识（多语言，支持中文）
const EMBEDDING_MODEL = '@cf/baai/bge-m3';

// ============================================================
// 文档导入
// ============================================================

/**
 * 导入一篇知识文档到 Vectorize
 * 
 * 流程：分块 → Embedding → 存入 Vectorize → 记录元数据到 D1
 */
export async function ingestDocument(
  env: Env,
  content: string,
  metadata: DocumentMetadata,
  chunkOptions?: ChunkOptions
): Promise<{ documentId: string; chunkCount: number }> {
  const documentId = generateDocumentId(metadata.title);

  // 1. 分块
  const chunks = chunkDocument(content, documentId, metadata.title, chunkOptions);
  
  if (chunks.length === 0) {
    throw new Error('文档内容为空或过短，无法生成有效的知识片段。');
  }

  // 2. 批量生成 embedding（Workers AI 支持批量输入）
  const chunkTexts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddings(env, chunkTexts);

  // 3. 构建向量并存入 Vectorize
  const vectors: VectorizeVector[] = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: {
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      headingPath: chunk.headingPath,
      chunkIndex: chunk.chunkIndex,
      text: chunk.content.substring(0, 1000), // Vectorize metadata 有大小限制
    },
  }));

  // Vectorize upsert 批量限制：每次最多 1000 条
  const BATCH_SIZE = 100;
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, i + BATCH_SIZE);
    await env.VECTORIZE.upsert(batch);
  }

  // 4. 记录文档元数据到 D1
  try {
    await env.DB.prepare(`
      INSERT INTO knowledge_documents (id, title, source_file, chunk_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        chunk_count = excluded.chunk_count,
        updated_at = unixepoch()
    `).bind(documentId, metadata.title, metadata.sourceFile || '', chunks.length).run();
  } catch (e) {
    console.error('Failed to save document metadata to D1:', e);
  }

  return { documentId, chunkCount: chunks.length };
}

// ============================================================
// 上下文检索
// ============================================================

/**
 * 根据用户查询检索最相关的知识片段
 * 
 * @param env Worker 环境
 * @param userQuery 用户输入的文本
 * @param topK 返回的最相关片段数量（默认 5）
 * @param minScore 最低相似度阈值（默认 0.5）
 */
export async function retrieveContext(
  env: Env,
  userQuery: string,
  topK: number = 5,
  minScore: number = 0.5
): Promise<RAGContext> {
  // 1. 将用户查询向量化
  const queryEmbeddings = await generateEmbeddings(env, [userQuery]);
  const queryVector = queryEmbeddings[0];

  // 2. 在 Vectorize 中查询最相似的向量
  const results = await env.VECTORIZE.query(queryVector, {
    topK,
    returnMetadata: 'all',
  });

  // 3. 过滤低分结果并提取文本
  const filteredMatches = results.matches.filter(m => m.score >= minScore);

  const context: RAGContext = {
    chunks: [],
    scores: [],
    sourceDocuments: [],
    chunkIds: [],
  };

  for (const match of filteredMatches) {
    const metadata = match.metadata as Record<string, string> | undefined;
    if (metadata) {
      context.chunks.push(metadata.text || '');
      context.scores.push(match.score);
      context.sourceDocuments.push(metadata.documentTitle || 'unknown');
      context.chunkIds.push(match.id);
    }
  }

  return context;
}

/**
 * 将 RAG 检索结果格式化为可注入 System Prompt 的文本
 */
export function formatRAGContext(context: RAGContext): string {
  if (context.chunks.length === 0) {
    return '';
  }

  const lines = context.chunks.map((chunk, i) => {
    const source = context.sourceDocuments[i];
    const score = (context.scores[i] * 100).toFixed(0);
    return `【知识参考 ${i + 1}】(来源: ${source}, 相关度: ${score}%)\n${chunk}`;
  });

  return `\n\n---\n以下是从专业知识库中检索到的相关参考材料，请在回复中参考但不要直接引用或暴露来源：\n\n${lines.join('\n\n')}`;
}

// ============================================================
// 文档管理
// ============================================================

/**
 * 列出所有已导入的知识文档
 */
export async function listDocuments(env: Env): Promise<DocumentMetadata[]> {
  try {
    const result = await env.DB.prepare(
      'SELECT id, title, source_file, chunk_count, created_at FROM knowledge_documents ORDER BY created_at DESC'
    ).all();
    return (result.results || []) as unknown as DocumentMetadata[];
  } catch (e) {
    console.error('Failed to list documents:', e);
    return [];
  }
}

/**
 * 删除指定文档的所有向量和元数据
 */
export async function deleteDocument(env: Env, documentId: string): Promise<void> {
  // 1. 从 D1 获取 chunk 数量
  try {
    const doc = await env.DB.prepare(
      'SELECT chunk_count FROM knowledge_documents WHERE id = ?'
    ).bind(documentId).first<{ chunk_count: number }>();

    if (doc) {
      // 2. 构建所有 chunk ID 并从 Vectorize 删除
      const chunkIds = Array.from(
        { length: doc.chunk_count },
        (_, i) => `${documentId}_${i}`
      );
      
      if (chunkIds.length > 0) {
        await env.VECTORIZE.deleteByIds(chunkIds);
      }
    }

    // 3. 从 D1 删除元数据
    await env.DB.prepare('DELETE FROM knowledge_documents WHERE id = ?')
      .bind(documentId).run();
  } catch (e) {
    console.error('Failed to delete document:', e);
    throw new Error(`删除文档失败: ${e}`);
  }
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 调用 Workers AI BGE-M3 生成 embedding 向量
 */
async function generateEmbeddings(env: Env, texts: string[]): Promise<number[][]> {
  const response = await env.AI.run(EMBEDDING_MODEL, {
    text: texts,
  }) as EmbeddingResponse;

  return response.data;
}

/**
 * 生成文档 ID（基于标题的简单 hash）
 */
function generateDocumentId(title: string): string {
  // 简单的字符串 hash，生产环境可以用 crypto.subtle
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    const char = title.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `doc_${Math.abs(hash).toString(36)}`;
}
