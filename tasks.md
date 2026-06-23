# RE-THINK Agent — Task Checklist

> 状态标记：`[ ]` 待完成 | `[/]` 进行中 | `[x]` 已完成

---

## Phase 1 — 规划与确认

- [x] 分析需求，输出 `plan.md` 技术架构文档
- [x] 输出 `tasks.md` 分步实现清单
- [x] 等待用户确认方案 ✓ 用户已确认：硅基流动+DeepSeek-V3，需要D1持久化，Wrangler已就绪

---

## Phase 2 — 脚手架搭建 ✓ 已完成

- [x] 在项目根目录初始化 npm workspaces `package.json`
- [x] 初始化 `worker/` 子包（Hono + Cloudflare Workers）
  - [x] `worker/package.json`
  - [x] `worker/tsconfig.json`
  - [x] 安装依赖：`hono`, `openai`, `@cloudflare/workers-types`
- [x] 初始化 `web/` 子包（React + Vite + Tailwind）
  - [x] 使用 `create-vite` 生成 React-TS 模板
  - [x] 安装依赖：`tailwindcss`, `zustand`, `react-markdown`
  - [x] 配置 `tailwind.config.ts` 和 `postcss.config.js`
- [x] 创建 `wrangler.toml`（统一配置）
- [x] 创建 `.dev.vars.example` 环境变量模板
- [x] 创建 `.gitignore`
- [x] 验证：`wrangler dev` 能启动 worker；`npm run dev` 能启动 web

---

## Phase 3 — 后端实现 ✓ 已完成

- [x] `worker/src/index.ts` — Worker 入口
- [x] `worker/src/middleware/cors.ts` — CORS 配置
- [x] `worker/src/lib/cbt-stages.ts` — CBT 五阶段检测逻辑
  - [x] 阶段枚举与关键词映射表
  - [x] `detectStage(text: string): CBTStage` 函数
- [x] `worker/src/lib/llm.ts` — OpenAI SDK 封装
  - [x] 注入 CBT System Prompt (已升级为温柔心理医生)
  - [x] 支持流式（stream=true）和非流式（stream=false）
  - [x] 从 SSE chunks 中实时提取 stage 信息
- [x] `worker/src/routes/chat.ts` — `POST /api/chat` 路由
  - [x] 请求体验证
  - [x] 接入 Cloudflare D1 持久化历史会话
  - [x] 流式响应：返回 `text/event-stream`
  - [x] 错误处理（API 超时、Key 无效）
- [x] 本地测试：通过 TypeScript 类型校验
- [x] 更新 `tasks.md`

---

## Phase 4 — 前端实现 ✓ 已完成

- [x] `web/src/types/index.ts` — TypeScript 类型定义
- [x] `web/src/index.css` — 全局样式
  - [x] CSS 变量（颜色、字体、间距）
  - [x] 温暖平易近人的基础 `body` 样式
  - [x] 脉冲动画 `@keyframes`
  - [x] 扫描光标动画
- [x] `web/src/store/chatStore.ts` — Zustand 状态
  - [x] messages 列表
  - [x] currentStage 当前 CBT 阶段
  - [x] isStreaming 流式状态标志
- [x] `web/src/hooks/useChat.ts` — SSE 流接收 hook
  - [x] `EventSource` / `fetch + ReadableStream` 解析
  - [x] 实时 append delta 到消息
  - [x] 阶段切换触发
- [x] `web/src/components/StatusDot.tsx`
- [x] `web/src/components/StageIndicator.tsx` — 左侧五步指示器
  - [x] 未激活 / 激活 / 已完成三种状态
  - [x] 激活阶段脉冲光圈动画
- [x] `web/src/components/MessageBubble.tsx` — 消息气泡
  - [x] AI 和用户消息差异化样式
  - [x] Markdown 渲染
  - [x] 流式打字机效果（cursor blink）
- [x] `web/src/components/InputBar.tsx` — 底部输入区
  - [x] Shift+Enter 换行；Enter 发送
  - [x] 流式中禁用输入
  - [x] 发送按钮状态切换
- [x] `web/src/components/ChatPanel.tsx` — 主对话区
  - [x] 消息列表自动滚动到底
  - [x] 空状态提示文案（温暖风格）
- [x] `web/src/App.tsx` — 整体布局组装
  - [x] 左侧 `StageIndicator` + 右侧 `ChatPanel` + 底部 `InputBar`
  - [x] 响应式处理（移动端折叠左侧栏）
- [x] `vite.config.ts` 配置 `/api` 代理到 worker 本地端口
- [x] 更新 `tasks.md`

---

## Phase 5 — 部署 ✓ 已完成

- [x] 本地集成联调（前端 + 后端同时运行）
- [x] 在 Cloudflare Dashboard 创建 Pages 项目或使用 CLI
- [x] 配置 Cloudflare Worker Secrets（`API_KEY` 等）
- [x] 执行 `wrangler deploy`（Worker 部署）
- [x] 执行 Pages 构建与发布（`npm run build` → 上传到 Pages）
- [x] 验证线上访问地址可用
- [x] 更新 `tasks.md` 为全部完成

---

## Phase 6 — 模型迁移 & RAG 基础设施 ✓ 已完成

- [x] 更新 `llm.ts`：OpenRouter + Llama 3.3 70B 配置
- [x] 更新 `chat.ts`：消除重复 System Prompt
- [x] 更新 `types.ts`：新增 AI/VECTORIZE 绑定类型
- [x] 更新 `wrangler.toml`：新增 Vectorize + AI 绑定
- [x] 创建 D1 迁移：`knowledge_documents` 表
- [x] 创建 `worker/src/lib/chunker.ts` 文档分块器
- [x] 创建 `worker/src/lib/rag.ts` RAG 核心模块
- [x] 创建 `worker/src/routes/ingest.ts` 知识导入 API
- [x] 更新 `.dev.vars.example`

---

## Phase 7 — 意图路由 & Prompt 重构 ✓ 已完成

- [x] 创建 `worker/src/lib/intent-router.ts` 意图分类器
- [x] 重构 `llm.ts`：模块化 `buildSystemPrompt()`
- [x] 集成意图路由到 `chat.ts` 请求流程
- [x] 集成 RAG 检索到 emotional 路径

---

## 已知风险与应对

| 风险 | 应对策略 |
|------|---------|
| Worker SSE 流在 Cloudflare 可能需要特殊配置 | 使用 `TransformStream` + `ReadableStream` 替代 Node.js stream |
| OpenAI SDK 在 Edge 运行时不完整支持 | 使用 `fetch` 直接调用 API 或固定 `openai@^4` 配置 `dangerouslyAllowBrowser: false` |
| TailwindCSS v4 破坏性变更 | 锁定使用 TailwindCSS v3.x |
| CORS 在同域 Pages+Worker 中可能无需配置 | 开发阶段保留 CORS，生产可收窄 |

---

## Phase 10 — 知识库导入 ✓ 已完成

- [x] 调用 `/api/knowledge/ingest` 接口导入 `cbt_core_rules.md`
- [x] 文档分块（12 chunks）并向量化存储到 Vectorize
- [x] 验证 RAG 检索 + Llama 模型端到端响应正常

---

## Phase 11 — 动态引导与后端优化 (Option C)

- [x] 修复 `worker/src/routes/chat.ts` 中流式 JSON 解析导致的 `agent_reply` 泄露问题
- [x] 后端新增 `/api/onboarding/analyze` 路由，用于将用户的自由文本转化为结构化 `UserProfile`
- [x] 确保新的 `UserProfile` 生成逻辑与 FSM `Onboarding` 状态无缝集成
- [ ] 前端集成（暂缓，根据 "先不要管UI" 的指示，优先确保后端 API 就绪）

---

## Phase 12 — CBT 行为激活微习惯联动与 API 升级

- [x] 编写专业的《CBT 行为激活微习惯指南》文档并导入 Vectorize (包含 C-SSRS 筛查)
- [x] 编写测试脚本 `test-behavior-activation-rag.ts` 并验证结果 (5/5 通过)
- [ ] 升级前后端类型定义以同步 `microActions` 字段 (`types.ts`)
- [ ] 修改 `OUTPUT_FORMAT_JSON` 规范大模型结构化输出 `micro_actions`
- [ ] 重构 `PROMPT_SOCRATIC` 认知重构提示词以引入 RAG 动作提取建议
- [ ] 升级 `chat.ts` 路由实现非流式和流式（SSE）下的行为建议解析与下发

---

## Phase 13 — 基于 2026.06 问卷反馈的体验与功能优化

- [ ] **开发完整的长期记忆总结与提取后端系统（工作量较大）**
  - [ ] 在 `chat.ts` 新会话建立时自动从 D1 获取历史会话的 `icebreaker` 画像信息并注入 System Prompt
  - [ ] 定期总结历史对话，建立长期记忆池，应对问卷中 `no_memory` 痛点和 `full_memory` 偏好
- [ ] **“情绪天气”历史看板（Mood Map）**
  - [ ] 后端支持获取历史心理天气曲线的接口，前端配合展示以对抗用户的防御性模糊
- [ ] **极致隐私安全（阅后即焚模式）**
  - [ ] 允许用户勾选“阅后即焚”隐私偏好，在退出会话或前端重置时自动擦除云端与本地会话缓存
- [ ] **前端微习惯任务小卡片渲染**
  - [ ] 前端集成接收 `microActions`，在消息气泡下方以卡片形式温和展示微习惯建议，降低青少年的行动难度


