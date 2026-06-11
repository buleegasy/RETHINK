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

export interface RAGRetrievalDecision {
  shouldRetrieve: boolean;
  query: string;
  reason: string;
}

export interface DocumentMetadata {
  title: string;
  sourceFile?: string;
}

interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

export interface RAGRetrievalOptions {
  intent?: string;
  fsmState?: string;
  userMessage?: string;
  finalTopK?: number;
  safetyFirst?: boolean;
}

interface RankedMatch {
  match: VectorizeMatch;
  adjustedScore: number;
  sourceKey: string;
  sourceTitle: string;
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
  minScore: number = 0.5,
  options?: RAGRetrievalOptions
): Promise<RAGContext> {
  // 1. 将用户查询向量化
  const queryEmbeddings = await generateEmbeddings(env, [userQuery]);
  const queryVector = queryEmbeddings[0];

  // 2. 在 Vectorize 中查询最相似的向量
  const results = await env.VECTORIZE.query(queryVector, {
    topK,
    returnMetadata: 'all',
  });

  // 3. 过滤低分结果，并结合场景做轻量重排
  const rankedMatches = results.matches
    .filter(m => m.score >= minScore)
    .map(match => {
      const metadata = match.metadata as Record<string, unknown> | undefined;
      return {
        match,
        adjustedScore: scoreRAGMatch(match, userQuery, options),
        sourceKey: getSourceKey(metadata),
        sourceTitle: String(metadata?.documentTitle || 'unknown'),
      };
    })
    .sort((a, b) => b.adjustedScore - a.adjustedScore);

  const finalTopK = options?.finalTopK ?? topK;
  const filteredMatches = diversifyRankedMatches(
    rankedMatches,
    finalTopK,
    options?.safetyFirst ? 1 : 2,
    options?.safetyFirst ?? false,
  );

  const context: RAGContext = {
    chunks: [],
    scores: [],
    sourceDocuments: [],
    chunkIds: [],
  };

  for (const { match, adjustedScore } of filteredMatches) {
    const metadata = match.metadata as Record<string, string> | undefined;
    if (metadata) {
      context.chunks.push(metadata.text || '');
      context.scores.push(Math.min(0.99, Math.max(0, adjustedScore)));
      context.sourceDocuments.push(metadata.documentTitle || 'unknown');
      context.chunkIds.push(match.id);
    }
  }

  return context;
}

function diversifyRankedMatches(
  rankedMatches: RankedMatch[],
  finalTopK: number,
  maxPerSource: number,
  safetyFirst: boolean,
): RankedMatch[] {
  const orderedCandidates = safetyFirst
    ? [
        ...rankedMatches.filter(({ match }) => isSafetyKnowledgeMatch(match)),
        ...rankedMatches.filter(({ match }) => !isSafetyKnowledgeMatch(match)),
      ]
    : rankedMatches;

  const selected: RankedMatch[] = [];
  const sourceCounts = new Map<string, number>();

  for (const candidate of orderedCandidates) {
    if (selected.length >= finalTopK) break;
    const count = sourceCounts.get(candidate.sourceKey) || 0;
    if (count >= maxPerSource) continue;
    selected.push(candidate);
    sourceCounts.set(candidate.sourceKey, count + 1);
  }

  if (selected.length < finalTopK) {
    for (const candidate of orderedCandidates) {
      if (selected.length >= finalTopK) break;
      if (selected.some(item => item.match.id === candidate.match.id)) continue;
      selected.push(candidate);
    }
  }

  return selected;
}

function scoreRAGMatch(
  match: VectorizeMatch,
  userQuery: string,
  options?: RAGRetrievalOptions
): number {
  const metadata = match.metadata as Record<string, unknown> | undefined;
  const title = String(metadata?.documentTitle || '');
  const text = String(metadata?.text || '');
  const id = String(match.id || '');
  const haystack = `${title}\n${text}\n${id}`.toLowerCase();
  const query = `${userQuery}\n${options?.userMessage || ''}`.toLowerCase();
  const intent = options?.intent || '';
  const fsmState = options?.fsmState || '';

  let score = match.score;

  if (isSafetySensitive(query, intent, fsmState)) {
    score += keywordBoost(haystack, [
      'safety', '危机', '安全', '自杀', '自伤', '自残', '伤害自己', '不想活',
      '热线', '12355', '求助', '转介', '监护人', '急救', '未成年人',
    ], 0.26);
    score += keywordBoost(haystack, ['who', 'nice', 'guideline', '指南', '权威', 'clinical'], 0.08);
    if (hasAny(haystack, ['行为激活', '微习惯']) && !hasAny(haystack, ['危机', '安全', '自伤', '自杀', '求助'])) {
      score -= 0.12;
    }
  }

  if (hasAny(query, ['欺凌', '霸凌', '排挤', '孤立', '威胁', '勒索', '打我', '辱骂', '传谣'])) {
    score += keywordBoost(haystack, [
      '欺凌', '霸凌', '校园', '同伴', '同学', '排挤', '孤立', '威胁',
      '证据', '老师', '家长', '求助', '安全', '保护',
    ], 0.22);
    if (hasAny(haystack, ['行为激活', '微习惯']) && !hasAny(haystack, ['同伴', '校园', '欺凌', '霸凌', '安全'])) {
      score -= 0.08;
    }
  }

  if (intent === 'academic_stress') {
    score += keywordBoost(haystack, ['考试', '成绩', '学业', '压力', '反刍', '睡眠', '认知重构', '行为激活'], 0.12);
  }

  if (intent === 'family_pressure') {
    score += keywordBoost(haystack, ['家庭', '父母', '家长', '沟通', '边界', '压力', '支持'], 0.12);
  }

  if (intent === 'source_trace') {
    score += keywordBoost(haystack, ['来源', '证据', '指南', '权威', '规则', 'clinical', 'policy'], 0.1);
  }

  return score;
}

function isSafetyKnowledgeMatch(match: VectorizeMatch): boolean {
  const metadata = match.metadata as Record<string, unknown> | undefined;
  const title = String(metadata?.documentTitle || '');
  const text = String(metadata?.text || '');
  const id = String(match.id || '');
  const haystack = `${title}\n${text}\n${id}`.toLowerCase();

  return hasAny(haystack, [
    'safety_chunks', '危机', '安全', '自伤', '自杀', '自残', '伤害自己',
    '热线', '12355', '求助', '转介', '监护人', '未成年人', '校园',
    '欺凌', '霸凌', '威胁', '勒索', '保护', '证据', '老师', '家长',
    'c-ssrs',
  ]);
}

function getSourceKey(metadata?: Record<string, unknown>): string {
  const title = String(metadata?.documentTitle || '').trim();
  const documentId = String(metadata?.documentId || '').trim();
  const headingPath = String(metadata?.headingPath || '').trim();
  return title || documentId || headingPath || 'unknown';
}

function isSafetySensitive(query: string, intent: string, fsmState: string): boolean {
  return intent === 'crisis'
    || fsmState === 'Crisis_Escalation'
    || hasAny(query, [
      '不想活', '想死', '自杀', '自伤', '自残', '割腕', '吞药', '跳楼',
      '伤害自己', '不想醒', '欺凌', '霸凌', '威胁', '勒索',
    ]);
}

function keywordBoost(text: string, keywords: string[], amount: number): number {
  const hits = keywords.filter(keyword => text.includes(keyword.toLowerCase())).length;
  if (hits === 0) return 0;
  return Math.min(amount, hits * (amount / 3));
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some(keyword => text.includes(keyword.toLowerCase()));
}

/**
 * 由模型自行决定当前轮是否需要查询知识库，并在需要时给出更适合检索的 query。
 */
export async function decideRAGRetrieval(
  env: Env,
  input: {
    userMessage: string;
    intent: string;
    fsmState: string;
    recentMessages?: string[];
  }
): Promise<RAGRetrievalDecision> {
  const apiBaseUrl = env.API_BASE_URL || 'https://openrouter.ai/api/v1';
  const apiKey = env.API_KEY;

  if (!apiKey) {
    return {
      shouldRetrieve: false,
      query: input.userMessage,
      reason: 'API_KEY 未配置，跳过知识库决策。',
    };
  }

  const model = env.MODEL_NAME || 'google/gemini-3.1-flash-lite';
  const recentContext = (input.recentMessages || []).slice(-4).join('\n');
  const systemPrompt = `你是 RAG 检索决策器。你的任务不是回答用户，而是决定当前轮是否应该查询心理支持知识库。

返回 JSON：
{
  "should_retrieve": true 或 false,
  "query": "如果需要检索，这里给出更适合向量检索的中文查询词或短句；不需要时也保留用户问题核心短语",
  "reason": "一句简短说明为什么查或为什么不查"
}

判断原则：
1. 当用户涉及心理技巧、应对建议、危机处置、认知偏差、家校沟通、睡眠/焦虑/低落/创伤/欺凌等具体问题时，优先检索。
2. 当用户只是纯闲聊、轻问候、无实际困扰时，不检索。
3. 如果用户问题需要更专业、更具体、更可执行的支持，优先检索。
4. query 要去掉口语赘述，保留核心场景、风险、技术关键词。
5. 只返回 JSON，不要返回解释性文本。`;

  const userPrompt = `用户最后一句：
${input.userMessage}

意图：
${input.intent}

FSM 状态：
${input.fsmState}

最近上下文：
${recentContext || '无'}
`;

  try {
    const res = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://re-think-agent.pages.dev',
        'X-Title': 'RE-THINK Agent',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`RAG decision request failed: ${res.status}`);
    }

    const data = await res.json() as any;
    const content = (data.choices?.[0]?.message?.content || '{}').trim();
    const parsed = JSON.parse(content);
    return {
      shouldRetrieve: Boolean(parsed.should_retrieve),
      query: String(parsed.query || input.userMessage).trim(),
      reason: String(parsed.reason || '').trim() || '模型建议检索。',
    };
  } catch (error) {
    console.warn('[RAG Decision] fallback to heuristic:', error);
    return {
      shouldRetrieve: input.intent !== 'casual' && input.intent !== 'ambiguous',
      query: input.userMessage,
      reason: '决策模型失败，回退到意图启发式规则。',
    };
  }
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
