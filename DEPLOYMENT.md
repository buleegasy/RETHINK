# RETHINK 项目部署与开发规范指南 (Deployment Rules & Specifications)

本规范定义了 RETHINK 系统的多环境部署架构、环境变量及发布操作流程。经过深度的架构优化，目前系统构建已经具备高度稳定性，为了确保接下来的开发与部署能够持续顺畅，所有开发活动必须严格遵守以下规则。

---

## 📌 一、 部署架构与域名映射

系统由前端单页应用 (SPA)、问卷表单系统以及 Serverless 后端 API 组成，统一托管在 Cloudflare 平台。

### 1. 活跃项目清单

| 模块名称 | 托管平台 | 目录 | 生产环境 URL (自定义域名) | 备用 Pages 域名 |
| :--- | :--- | :--- | :--- | :--- |
| **AI 智能聊天主界面** | Cloudflare Pages | `/web/` | `https://rethink.buleegasy.space` | `rethink-jv9.pages.dev` |
| **问卷填写系统** | Cloudflare Pages | `/web/public/survey/` | `https://survey.rethink.buleegasy.space` | `re-think-survey.pages.dev` |
| **问卷数据后台** | Cloudflare Pages | `/web/public/survey/dashboard/` | 暂无 (直接解析 Pages 域名) | `re-think-dashboard.pages.dev` |
| **统一后端 Worker** | Cloudflare Workers | `/worker/` | 见下方路由机制 | `re-think-agent-worker.workers.dev` |

### 2. 路由与代理转发规则 (CORS 规避机制)
为规避国内网络污染及跨域 OPTIONS 预检拦截，**严禁在前端直接配置后端 Worker 的 `workers.dev` 域名**。
后端 API 通过 Cloudflare 域名路由拦截进行内部流转：
- **API 请求代理**：任何到达 `rethink.buleegasy.space/api/*` 的请求均被 Cloudflare 边缘节点直接拦截并流转给 `re-think-agent-worker`。
- **Worker 路由映射 (`worker/wrangler.toml`)**：
  ```toml
  routes = [
    { pattern = "rethink.buleegasy.space/api/*", zone_name = "buleegasy.space" },
    { pattern = "survey.rethink.buleegasy.space/api/*", zone_name = "buleegasy.space" }
  ]
  ```

---

## 🔑 二、 环境变量与依赖规范

### 1. 后端 Worker 环境变量 (`re-think-agent-worker`)
- **常规配置 (`worker/wrangler.toml`)**:
  - `FIREBASE_PROJECT_ID`: `"rethink-852d8"`
  - `API_BASE_URL`: `"https://openrouter.ai/api/v1"`
  - `MODEL_NAME`: `"meta-llama/llama-4-maverick"`
- **敏感 Secrets (必须在 Cloudflare Dashboard 或 `wrangler secret put` 配置)**:
  - `API_KEY` (OpenRouter API Key)
  - `FIREBASE_API_KEY`
  - `ADMIN_SECRET_TOKEN`

### 2. 前端环境变量 (`re-think-web`)
- **配置文件**: `/web/.env.production`
- **规则**:
  ```env
  VITE_API_URL=https://rethink.buleegasy.space/api
  ```
  > [!NOTE]
  > 前端底层 `fetch` 拦截器已内置 `/api/api/` 的双重 URL 清理和去重机制，即便 `VITE_API_URL` 包含后缀，拼接接口时也不会出错。

### 3. 严格的依赖管理红线
> [!CAUTION]
> **绝对禁止通过 NPM 引入超大型计算机视觉库（如 `face-api.js` 等）加入 Vite 依赖链**。
> 先前由于依赖此类复杂包，会导致 TypeScript 编译器陷入无限递归死循环，并直接撑爆 Cloudflare Pages 的 3GB 构建容器内存，导致流水线 100% 挂起并失败。
> **正解：改用 CDN 注入方式**（位于 `index.html` 中），绕开打包工具的语法树解析，直接使用全局变量（如 `window.faceapi`），以保障构建速度和线上部署稳定性。

---

## 📦 三、 构建与发布规则

### 1. 前端应用发布 (Cloudflare Pages CI/CD)
**所有前端 `re-think-web` 项目的正式生产发布，统一委托给 Cloudflare Pages 的 GitHub CI/CD 自动运行。**
经过架构重构，本地已支持秒级运行 `npm run build`，建议提交代码前先做本地预检，生产环境直接将代码推送到 `buleegasy/RETHINK` 仓库的 `main` 分支触发云端编译即可。

### 2. 问卷及后台页面的独立发布
由于问卷 `/web/public/survey/` 与数据后台 `/web/public/survey/dashboard/` 为纯静态单页，若单独更新，可通过 Wrangler CLI 发布：
```bash
npx wrangler pages deploy public/survey --project-name re-think-survey
npx wrangler pages deploy public/survey/dashboard --project-name re-think-dashboard
```

### 3. 后端 Worker 发布
任何后端核心逻辑修改，在 `worker` 目录下执行：
```bash
cd worker
npx wrangler deploy
```

---

## 🚨 四、 部署前核对清单 (Deployment Pre-flight Checklist)

为了保证后续每次迭代都不打破部署的稳定性，必须逐项核对：

- [ ] **大型依赖排查**：是否通过 npm 引入了超大体积且类型定义异常复杂的第三方前端库？如果是，请改为从 `<script>` CDN 引入，以免挂起云端的 Vite 构建进程。
- [ ] **TypeScript 版本稳定**：确保 `web/package.json` 中的 `typescript` 锁定在稳定的 `^5.5.0` 左右，坚决不使用不存在或测试版本。
- [ ] **CORS 与路由同步**：新增 API 路由或请求头时，确保 `worker/src/cors.ts` 和 `worker/wrangler.toml` 中的 `routes` 配置项已同步更新。
- [ ] **本地编译预检**：在推送 `main` 之前，必须在本地跑通一次 `cd web && npx tsc -b && npx vite build`，确保没有任何编译警告或挂起。
