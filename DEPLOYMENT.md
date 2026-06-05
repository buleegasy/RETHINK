# RE-THINK 心理学竞赛项目部署管理文档

本项目分为前端网页端和后端服务端，采用前后端分离架构，均托管在 Cloudflare 的 Serverless 生态中。为了规避国内的网络污染和跨域问题，各个模块之间通过云端内网代理进行连接，各自独立。

---

## 一、 独立项目及域名清单

### 1. AI 聊天主界面 (Main Web UI)
- **项目名称**：`re-think-web` (Cloudflare Pages)
- **代码目录**：`/web/`
- **构建输出**：`dist` (通过 React/Vite 构建)
- **外网域名**：[https://rethink.buleegasy.space](https://rethink.buleegasy.space) 
- **更新部署命令**（在 `web/` 目录下）：
  ```bash
  npm run build
  npx wrangler pages deploy dist --project-name re-think-web
  ```

### 2. 问卷填写系统 (Survey)
- **项目名称**：`re-think-survey` (Cloudflare Pages)
- **代码目录**：`/web/public/survey/` 
- **外网域名**：[https://survey.rethink.buleegasy.space](https://survey.rethink.buleegasy.space)
- **网络流向**：前端表单通过相对路径 `/api/survey/submit` 提交，代码目录下的 `_worker.js` 负责拦截该请求，并在 Cloudflare 边缘节点内部，直接转发给后端 Worker。
- **更新部署命令**（在 `web/` 目录下）：
  ```bash
  npx wrangler pages deploy public/survey --project-name re-think-survey
  ```

### 3. 问卷数据统计后台 (Dashboard)
- **项目名称**：`re-think-dashboard` (Cloudflare Pages)
- **代码目录**：`/web/public/survey/dashboard/`
- **外网域名**：[https://re-think-dashboard.pages.dev](https://re-think-dashboard.pages.dev) (如需二级域名可去 Cloudflare 控制台给该项目绑定)
- **网络流向**：同样依靠该目录下的 `_worker.js` 代理访问 `/api/survey/results` 获取真实数据，免除了跨域烦恼。
- **更新部署命令**（在 `web/` 目录下）：
  ```bash
  npx wrangler pages deploy public/survey/dashboard --project-name re-think-dashboard
  ```

### 4. 统一后端服务 (Agent API Worker)
- **项目名称**：`re-think-agent-worker` (Cloudflare Worker)
- **代码目录**：`/worker/`
- **外网域名**：`api.buleegasy.space` 
- **职责说明**：处理对话逻辑、调用大语言模型 (OpenRouter)、记录并查询问卷和聊天 Session。
- **更新部署命令**（在 `worker/` 目录下）：
  ```bash
  npx wrangler deploy
  ```

---

## 二、 数据库与基础组件存储

后端 Worker 连接了 Cloudflare 内部的如下服务，**请不要轻易更改其绑定 ID**：

1. **D1 关系型数据库** (`re-think-sessions`)
   - 包含表 `sessions`：记录用户 AI 对话历史及情境。
   - 包含表 `surveys`：记录这 3 个前端项目产生的所有问卷数据源。
2. **Vectorize 向量数据库** (`sag-knowledge-index`)
   - 存储用于 RAG (检索增强生成) 的文档 Embeddings。
3. **Workers AI**
   - 挂载了 Cloudflare 原生的嵌入模型用于文本向量化处理。

---

## 三、 日常开发避坑指南（必看）

1. **请求跨域 (CORS) 报错或国内无法加载：**
   - 不要试图在后端通过修改 headers (`Access-Control-Allow-Origin: *`) 来解决。国内直连 `workers.dev` 往往会引发 SSL 重置或 DNS 劫持。
   - **正确的做法**是：确保前端项目同级目录下存在 `_worker.js` 代理文件，且前端 fetch 的是**相对路径**（例如 `/api/...`）。
2. **问卷及后台修改更新：**
   - 问卷系统和数据后台现在是**完全分离**的两个项目。改了问卷内容，只需 deploy `public/survey`；改了后台图表，只需 deploy `public/survey/dashboard`。千万不要推错文件夹。
