# RETHINK 项目部署与规范指南 (Deployment Rules & Specifications)

本规范定义了 RETHINK 系统的多环境部署架构、域名映射、环境变量及发布操作流程。为了确保系统的高可用性、避免跨域 (CORS) 错误以及防御发布冲突，所有开发部署活动必须严格遵守以下规则。

---

## 📌 一、 部署架构与域名映射

系统由前端单页应用 (SPA)、问卷表单系统以及 Serverless 后端 API 组成，统一托管在 Cloudflare 平台。

### 1. 活跃项目清单

| 模块名称 | 托管平台 | 目录 | 生产环境 URL (自定义域名) | 备用 Pages 域名 |
| :--- | :--- | :--- | :--- | :--- |
| **AI 智能聊天主界面** | Cloudflare Pages | `/web/` | `https://rethink.buleegasy.space` | `rethink-jv9.pages.dev` |
| **问卷填写系统** | Cloudflare Pages | `/web/public/survey/` | `https://survey.rethink.buleegasy.space` | `re-think-survey.pages.dev` |
| **问卷数据后台** | Cloudflare Pages | `/web/public/survey/dashboard/` | 暂无 (直接解析 Pages 域名) | `re-think-dashboard.pages.dev` |
| **统一后端 Worker** | Cloudflare Workers | `/worker/` | 见下方路由解析机制 | `re-think-agent-worker.workers.dev` |

### 2. 路由与代理转发规则 (CORS 规避机制)
为规避国内网络污染及跨域 OPTIONS 预检拦截，**严禁在前端直接配置后端 Worker 的 `workers.dev` 域名**。
后端 API 必须通过 Cloudflare 域名路由拦截进行内部流转：
- **聊天接口代理**：任何到达 `rethink.buleegasy.space/api/*` 的请求均被 Cloudflare 边缘节点直接拦截并转发给 `re-think-agent-worker`。
- **问卷接口代理**：任何到达 `survey.rethink.buleegasy.space/api/*` 的请求被拦截并转发至 Worker 对应的处理逻辑。
- **Worker 路由映射 (`worker/wrangler.toml`)**：
  ```toml
  routes = [
    { pattern = "rethink.buleegasy.space/api/*", zone_name = "buleegasy.space" },
    { pattern = "survey.rethink.buleegasy.space/api/*", zone_name = "buleegasy.space" }
  ]
  ```

---

## 🔑 二、 环境变量与 Secrets 管理规范

所有敏感信息与环境依赖变量必须严格按规范进行配置，严禁明文提交到 Git 仓库。

### 1. 后端 Worker 环境变量 (`re-think-agent-worker`)
- **常规环境变量 (通过 `worker/wrangler.toml` 配置)**:
  - `FIREBASE_PROJECT_ID`: `"rethink-852d8"` (Firebase 项目 ID)
  - `API_BASE_URL`: `"https://openrouter.ai/api/v1"` (OpenRouter 服务端)
  - `MODEL_NAME`: `"meta-llama/llama-4-maverick"`
  - `TURNSTILE_SECRET_KEY`: Turnstile 校验密钥
- **敏感 Secrets (必须在 Cloudflare Dashboard 或通过 `wrangler secret put` 配置)**:
  - `API_KEY`: OpenRouter API Key
  - `FIREBASE_API_KEY`: Firebase 认证 Web API 密钥
  - `ADMIN_SECRET_TOKEN`: 管理后台（邀请码管理）的全局主 Token（默认: `admin123`）

### 2. 前端环境变量 (`re-think-web`)
- **配置文件**: `/web/.env.production`
- **规则**:
  ```env
  VITE_API_URL=https://rethink.buleegasy.space/api
  ```
  > [!IMPORTANT]
  > `VITE_API_URL` 必须指向带 `/api` 后缀的拦截域名，不可指向后端 Worker 的真实 `workers.dev` 地址，否则会导致 CORS 拦截。

---

## 📦 三、 构建与发布规则

### 1. ⚠️ 严禁本地打包前端主程序 (Vite Build Rule)
- **规则**：由于 `face-api.js` 在 Vite 打包打包过程中极为消耗内存，极易导致本地 Node 进程内存溢出挂起。因此，**严禁在本地执行 `npm run build` 进行前端生产打包**。
- **正解**：所有前端 `re-think-web` 项目的打包与发布必须委托给 **Cloudflare Pages 的 GitHub CI/CD** 自动运行。开发者只需将代码推送到 `buleegasy/RETHINK` 仓库的 `main` 分支，等待 Cloudflare 在云端编译完成即可。

### 2. 问卷及后台的手动部署
由于问卷 `/web/public/survey/` 与数据后台 `/web/public/survey/dashboard/` 为静态单页，可通过 Wrangler CLI 进行发布：
- **发布问卷系统**：
  ```bash
  npx wrangler pages deploy public/survey --project-name re-think-survey
  ```
- **发布大屏后台**：
  ```bash
  npx wrangler pages deploy public/survey/dashboard --project-name re-think-dashboard
  ```

### 3. 后端 Worker 部署
- **发布命令**：
  ```bash
  cd worker
  npx wrangler deploy
  ```

---

## 🚨 四、 部署前核对与验证清单 (Deployment Checklist)

在任何代码被推送到 `main` 或部署到线上前，必须逐项核对：

- [ ] **CORS 预检处理**：新增 API 路由或请求头（如 `x-admin-token`）时，确保 `worker/src/cors.ts` 中对应的 `allowHeaders` 和 `allowMethods` 已完成同步更新。
- [ ] **路由匹配规则**：在 `worker/wrangler.toml` 中的 `routes` 配置项必须保持最新，不得漏掉新增的路由前缀。
- [ ] **独立性隔离**：确认问卷页面中的路由提交地址使用相对路径 `/api/survey/submit`；数据后台大屏组件使用相对路径 `/api/survey/results`。
- [ ] **发布验证**：前端 Pages 部署完毕后，必须使用**浏览器无痕模式**（以穿透 CDN 强缓存）访问自定义域名进行完整链路（登录 -> 聊天 -> 问卷提交 -> 管理后台查看）验证。
