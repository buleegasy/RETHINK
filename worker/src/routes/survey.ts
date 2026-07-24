import { Hono } from 'hono';
import { z } from 'zod';
import type { Env } from '../types';

interface SurveyDbRow {
  id: string;
  data: string;
  open_feedback: string;
  created_at: number;
}

const surveySubmitSchema = z.object({
  respondentId: z.string({ required_error: 'respondentId is required' }).min(1, 'respondentId is required'),
  openFeedback: z.string().optional().default(''),
}).passthrough();

export const surveyRouter = new Hono<{ Bindings: Env }>();

/**
 * 提交问卷结果
 * POST /api/survey/submit
 */
surveyRouter.post('/submit', async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => null);
    const parsed = surveySubmitSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'respondentId is required';
      return c.json({ error: errorMsg }, 400);
    }
    
    const body = { ...parsed.data };
    const id = body.respondentId;
    const openFeedback = body.openFeedback || '';
    
    // Add IP and region metadata
    const cf = c.req.raw.cf as { country?: string; region?: string; city?: string } | undefined;
    (body as Record<string, unknown>).metadata = {
      country: c.req.header('X-Client-Country') || cf?.country || 'Unknown',
      region: c.req.header('X-Client-Region') || cf?.region || 'Unknown',
      city: c.req.header('X-Client-City') || cf?.city || 'Unknown',
      ip: c.req.header('X-Client-IP') || c.req.header('cf-connecting-ip') || 'Unknown'
    };

    // 将完整数据转为字符串存储
    const dataStr = JSON.stringify(body);
    
    // 写入 D1 数据库
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO surveys (id, data, open_feedback, created_at) VALUES (?, ?, ?, ?)'
    )
    .bind(id, dataStr, openFeedback, Math.floor(Date.now() / 1000))
    .run();
    
    return c.json({ success: true, id });
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Survey Submit Error';
    console.error('Survey Submit Error:', err);
    return c.json({ error: message }, 500);
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
    .all<SurveyDbRow>();
    
    // 解析每个记录的 data 字段为 JSON 对象
    const parsedResults = results.map((row) => {
      let parsedData: Record<string, unknown> = {};
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
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Survey Fetch Error';
    console.error('Survey Fetch Error:', err);
    return c.json({ error: message }, 500);
  }
});
