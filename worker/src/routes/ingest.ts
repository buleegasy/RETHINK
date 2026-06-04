/**
 * 知识库文档管理 API 路由
 * 
 * POST /api/knowledge/ingest  — 导入知识文档（Markdown 文本）
 * GET  /api/knowledge/list    — 列出已导入的文档
 * DELETE /api/knowledge/:id   — 删除指定文档
 */

import { Hono } from 'hono';
import type { Env } from '../types';
import { ingestDocument, listDocuments, deleteDocument } from '../lib/rag';

export const knowledgeRouter = new Hono<{ Bindings: Env }>();

/**
 * POST /api/knowledge/ingest
 * 
 * Body: { title: string, content: string, sourceFile?: string }
 */
knowledgeRouter.post('/ingest', async (c) => {
  const body = await c.req.json<{
    title: string;
    content: string;
    sourceFile?: string;
  }>();

  if (!body.title || !body.content) {
    return c.json({ error: 'title 和 content 不能为空' }, 400);
  }

  try {
    const result = await ingestDocument(
      c.env,
      body.content,
      { title: body.title, sourceFile: body.sourceFile }
    );

    return c.json({
      success: true,
      documentId: result.documentId,
      chunkCount: result.chunkCount,
      message: `文档 "${body.title}" 已成功导入，生成 ${result.chunkCount} 个知识片段。`,
    });
  } catch (err: any) {
    console.error('Ingest error:', err);
    return c.json({ error: err.message || '文档导入失败' }, 500);
  }
});

/**
 * GET /api/knowledge/list
 */
knowledgeRouter.get('/list', async (c) => {
  try {
    const documents = await listDocuments(c.env);
    return c.json({ documents });
  } catch (err: any) {
    return c.json({ error: err.message || '获取文档列表失败' }, 500);
  }
});

/**
 * DELETE /api/knowledge/:id
 */
knowledgeRouter.delete('/:id', async (c) => {
  const documentId = c.req.param('id');

  if (!documentId) {
    return c.json({ error: '缺少文档 ID' }, 400);
  }

  try {
    await deleteDocument(c.env, documentId);
    return c.json({
      success: true,
      message: `文档 ${documentId} 已删除。`,
    });
  } catch (err: any) {
    return c.json({ error: err.message || '删除失败' }, 500);
  }
});
