# RE-THINK Agent — Phase 1: 技术架构规划

## 项目概述

一个基于 CBT（认知行为疗法）的 AI 思维重塑 Web 应用，前后端一体化部署于 Cloudflare 平台。AI 后端以“专业且懂变通的心理医生”人格运作，在引导用户经历五步认知重构流程的同时，提供极强的情感兜底与情绪支撑。

---

## 部署拓扑 (V2 架构)

```
用户浏览器
    │
    ▼
Cloudflare Pages  (静态 React 构建产物)
    │  /api/* → 代理
    ▼
Cloudflare Workers  (Hono 后端)
    │
    ├─────────────┬─────────────┐
    ▼             ▼             ▼
 意图路由器      Workers AI    OpenRouter API
(代码级分类)    (BGE-M3 模型)   (Llama 3.3 70B)
                  ▼
          Cloudflare Vectorize
          (SAG 知识库向量索引)
                  ▼
          Cloudflare D1 (会话与文档元数据)
```

- **Pages** 托管前端静态资源，通过 `_routes.json` 将 `/api/*` 请求路由到同域 Worker。
- **Workers** 运行 Hono 服务，处理 API 逻辑（含意图分类与 RAG 检索），返回 SSE 流式响应。
- **OpenRouter** 提供 Llama 3.3 70B 模型。
- **单一 `wrangler.toml`** 管理整个 monorepo 的构建与部署。

---

## Monorepo 目录结构

```
re-think-agent/                    ← 项目根目录
├── wrangler.toml                  ← Cloudflare 统一配置（Workers + Pages）
├── .dev.vars                      ← 本地秘密变量模板（不提交 git）
├── .dev.vars.example              ← 秘密变量示例（提交 git）
├── .gitignore
├── package.json                   ← 根 package（workspaces）
├── plan.md                        ← 技术架构文档
├── tasks.md                       ← 任务清单
│
├── worker/                        ← Hono 后端 (Cloudflare Workers)
│   ├── package.json
│   ├── tsconfig.json
│   ├── migrations/                ← D1 数据库迁移文件
│   └── src/
│       ├── index.ts               ← Worker 入口，挂载 Hono app
│       ├── routes/
│       │   ├── chat.ts            ← POST /api/chat 路由 + 意图路由 + RAG
│       │   └── ingest.ts          ← 知识库文档管理 API
│       ├── lib/
│       │   ├── llm.ts             ← OpenRouter 封装与模块化 System Prompt
│       │   ├── cbt-stages.ts      ← CBT 五阶段检测逻辑
│       │   ├── intent-router.ts   ← 意图分类器 (casual/emotional/crisis/ambiguous)
│       │   ├── rag.ts             ← Vectorize + Workers AI 向量检索与存储
│       │   └── chunker.ts         ← Markdown 文档分块器
│       └── middleware/
│           └── cors.ts            ← CORS 中间件
│
└── web/                           ← React 前端 (Vite)
    ├── package.json
    ├── vite.config.ts             ← 开发时代理 /api → worker
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css              ← 全局样式 + CSS 变量（温暖平易近人的轻色系）
        ├── components/
        │   ├── ChatPanel.tsx      ← 主对话区（消息气泡流）
        │   ├── StageIndicator.tsx ← 左侧 CBT 阶段指示器（五步进度）
        │   ├── InputBar.tsx       ← 底部输入框（Send 按钮 + 流式状态）
        │   ├── MessageBubble.tsx  ← 单条消息渲染（Markdown 支持）
        │   └── StatusDot.tsx      ← 阶段激活状态指示点
        ├── hooks/
        │   ├── useChat.ts         ← SSE 流式接收 + 消息状态管理
        │   └── useCBTStage.ts     ← 根据 AI 响应推断当前 CBT 阶段
        ├── store/
        │   └── chatStore.ts       ← Zustand 全局状态（消息列表、阶段）
        └── types/
            └── index.ts           ← Message、CBTStage 等 TypeScript 类型
```

---

## 核心技术选型

| 层级 | 技术 | 版本/说明 |
|------|------|-----------|
| 运行时 | Cloudflare Workers | Edge Runtime |
| 后端框架 | Hono | ^4.x |
| 前端框架 | React | ^18.x |
| 前端构建 | Vite | ^5.x |
| 样式 | TailwindCSS | ^3.x |
| 状态管理 | Zustand | ^4.x |
| LLM 客户端 | openai (npm) | ^4.x，兼容所有 OpenAI 格式 API |
| 部署工具 | Wrangler | ^3.x |
| 语言 | TypeScript | ^5.x |

---

## API 设计

### `POST /api/chat`

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "我觉得自己一无是处" }
  ],
  "stream": true
}
```

**Response (stream=true):** `text/event-stream` SSE，每个 chunk 格式：
```
data: {"delta": "...", "stage": "扫描漏洞", "done": false}

data: {"delta": "", "stage": "扫描漏洞", "done": true}
```

**Response (stream=false):** `application/json`
```json
{
  "content": "...",
  "stage": "剥离事实",
  "intent": "emotional"
}
```

### `POST /api/knowledge/ingest` (RAG 知识导入)

**Request Body:**
```json
{
  "title": "CBT 核心规则",
  "content": "# 标题\n\n文档内容..."
}
```

---

## CBT 五阶段状态机

| 编号 | 阶段名称 | 关键词触发 | 指示器颜色 |
|------|---------|-----------|-----------|
| 1 | 剥离事实 | 初始对话 / "发生了什么" | `#4FC3F7` 冰蓝 |
| 2 | 捕获想法 | "你认为" / "想法是" | `#81C784` 冷绿 |
| 3 | 扫描漏洞 | "这个逻辑" / "你有没有考虑" | `#FFB74D` 警告橙 |
| 4 | 证据质询 | "证据是什么" / "事实支持" | `#E57373` 质询红 |
| 5 | 重构认知 | "换一种视角" / "新的理解" | `#CE93D8` 重构紫 |

阶段由后端在 SSE 响应元数据中携带，前端实时更新左侧指示器。

---

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `API_KEY` | OpenRouter API 密钥 | `sk-or-v1-...` |
| `API_BASE_URL` | LLM API 基础 URL | `https://openrouter.ai/api/v1` |
| `MODEL_NAME` | 模型名称 | `meta-llama/llama-3.3-70b-instruct` |

---

## 意图路由与 RAG 工作流

在 `POST /api/chat` 请求时，后端执行以下工作流：

1. **意图分类** (`classifyIntent`)：分析用户最后一句话，判定为 `casual`（闲聊）、`emotional`（倾诉）、`crisis`（危机）或 `ambiguous`（模糊）。
2. **RAG 检索**：仅当意图为 `emotional` 时，调用 Workers AI 生成向量，并从 Vectorize 检索最相关的知识片段。
3. **Prompt 组装** (`buildSystemPrompt`)：根据意图类型模块化组装系统提示词（如危机模式停用 CBT，倾诉模式注入 RAG 上下文）。
4. **LLM 调用**：向 OpenRouter 发送请求。

---

## 设计语言

- **色调**：温暖、平易近人的浅色系界面，背景为珍珠白/米白 `#FAF9F6`，卡片与面板以纯白与柔和的卡其色辅助。
- **主字体**：`JetBrains Mono`（代码感）+ `Inter`（正文）
- **对话气泡**：AI 消息左侧带头像框并使用浅灰色/白色底，用户消息右对齐使用微暖的卡其底色。
- **左侧阶段栏**：`240px` 固定宽，竖向阶段指示器，激活阶段高亮+脉冲动画。
- **阶段强调色**：使用柔和的水蓝、鼠尾草绿、蜜桃橙、珊瑚红、薰衣草紫。
- **底部输入**：全宽输入框，流式加载时显示扫描光标动画。
- **情感化交互**：无冰冷感，界面视觉传达包裹感与安全感。

---

## 核心工作流升级（情感兜底）

- **必须像真实人类一样说话**。
- 当识别到用户**情绪崩溃、极度自责或悲伤时**，必须【立即暂停】冷冰冰的逻辑推演。
- **优先给予真诚的安慰和情感支撑**。
- 只有当用户情绪平复后，才能用温暖、包容的话术，温柔地引导他们回到事实与逻辑的梳理上。

---

## Open Questions

> [!IMPORTANT]
> **LLM 服务商确认**：您使用的 `API_BASE_URL` 是哪家服务商（如 OpenAI、DeepSeek、智谱 AI 等）？这会影响模型名称配置和 Worker 兼容性。

> [!IMPORTANT]
> **流式 vs 非流式**：默认优先实现 SSE 流式响应（打字机效果），您是否同意？

> [!NOTE]
> **数据持久化**：已确认需要。接入 Cloudflare D1 进行历史会话的长期存储。
