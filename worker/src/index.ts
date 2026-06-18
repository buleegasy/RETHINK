import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import { chatRouter } from './routes/chat';
import { knowledgeRouter } from './routes/ingest';
import { onboardingRouter } from './routes/onboarding';
import { surveyRouter } from './routes/survey';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// 全局中间件
app.use('*', corsMiddleware);

// 基础健康检查
app.get('/', (c) => c.text('RE-THINK Agent API (Cloudflare Worker) is running!'));

// 挂载路由
app.route('/api/auth', authRouter);
app.route('/api/admin', adminRouter);
app.route('/api/chat', chatRouter);
app.route('/api/knowledge', knowledgeRouter);
app.route('/api/onboarding', onboardingRouter);
app.route('/api/survey', surveyRouter);

// 全局错误处理
app.onError((err, c) => {
  console.error('Global Error:', err);
  return c.json({ error: 'Internal Server Error', details: err.message }, 500);
});

export default app;

