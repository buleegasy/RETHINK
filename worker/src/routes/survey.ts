import { Hono } from 'hono';
import type { Env } from '../types';

export const surveyRouter = new Hono<{ Bindings: Env }>();

/**
 * 提交问卷结果
 * POST /api/survey/submit
 */
surveyRouter.post('/submit', async (c) => {
  try {
    const body = await c.req.json<any>();
    
    const id = body.respondentId;
    const openFeedback = body.openFeedback || '';
    
    if (!id) {
      return c.json({ error: 'respondentId is required' }, 400);
    }
    
    // 将完整数据转为字符串存储
    const dataStr = JSON.stringify(body);
    
    // 写入 D1 数据库
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO surveys (id, data, open_feedback, created_at) VALUES (?, ?, ?, ?)'
    )
    .bind(id, dataStr, openFeedback, Math.floor(Date.now() / 1000))
    .run();
    
    return c.json({ success: true, id });
  } catch (err: any) {
    console.error('Survey Submit Error:', err);
    return c.json({ error: err.message }, 500);
  }
});

/**
 * 获取所有问卷结果（供开发者/评委查看）
 * GET /api/survey/results
 */
surveyRouter.get('/results', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, data, open_feedback, created_at FROM surveys ORDER BY created_at DESC'
    )
    .all();
    
    // 解析每个记录的 data 字段为 JSON 对象
    const parsedResults = results.map((row: any) => {
      let parsedData = {};
      try {
        parsedData = JSON.parse(row.data);
      } catch (e) {
        console.error('Failed to parse survey data for ID:', row.id, e);
      }
      return {
        id: row.id,
        createdAt: new Date(row.created_at * 1000).toISOString(),
        openFeedback: row.open_feedback,
        data: parsedData
      };
    });
    
    return c.json({
      total: parsedResults.length,
      results: parsedResults
    });
  } catch (err: any) {
    console.error('Survey Fetch Error:', err);
    return c.json({ error: err.message }, 500);
  }
});
