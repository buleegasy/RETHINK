import { cors } from 'hono/cors';

// 本项目前后端同域（Pages代理），但在本地开发时，Vite在5173，Worker在8787。
// 因此开启 CORS 以方便本地联调。
export const corsMiddleware = cors({
  origin: '*', // 生产环境同域代理时其实不需要跨域，这里设为*方便调试
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
});
