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

// Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

// 基础健康检查
app.get('/', (c) => c.text('RE-THINK Agent API (Cloudflare Worker) is running!'));

import { voiceRouter } from './routes/voice';

// 挂载路由
app.route('/api/auth', authRouter);
app.route('/api/admin', adminRouter);
app.route('/api/chat', chatRouter);
app.route('/api/voice', voiceRouter);
app.route('/api/knowledge', knowledgeRouter);
app.route('/api/onboarding', onboardingRouter);
app.route('/api/survey', surveyRouter);

// 全局错误处理
app.onError((err, c) => {
  console.error('Global Error:', err);
  // Do not expose error details to the client to prevent sensitive info leaks
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;

