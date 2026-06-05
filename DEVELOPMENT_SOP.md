# RE-THINK 问卷与大屏开发更新规范 (SOP)

为了确保未来在更新问卷题目、扩展数据大屏分析维度以及数据同步时，不再出现类似“网络假死”、“渲染崩溃”或“跨域拦截”等严重事故，所有后续开发更新必须严格遵守以下规范。

## 一、 系统架构基准

目前系统由四个核心节点构成，架构逻辑如下：
1. **问卷与大屏前端 (Cloudflare Pages)**: 
   - 目录：`web/public/survey/`
   - 生产域名：`survey.rethink.buleegasy.space`
2. **后端代理层 (Cloudflare Pages Proxy)**:
   - 生产域名：`api-proxy-9mv.pages.dev`
   - 作用：统一处理复杂的 CORS 跨域请求（特别是处理浏览器发出的 OPTIONS 预检请求），防止前端直接请求云函数被安全拦截。
3. **数据库处理层 (Cloudflare Workers)**:
   - 项目：`re-think-agent-worker`
   - 作用：接收代理层的清洗请求，与底层 D1 数据库进行通讯。
4. **底层存储 (Cloudflare D1)**:
   - 存储形式：Schema-less JSON 字符串（保存在 `surveys.data` 字段中），这意味着增加任何题目都**不需要**修改数据库表结构。

---

## 二、 问卷更新规范 (Survey Updates)

当需要增加、修改或调整问卷题目时：

1. **版本号隔离原则 (Version Control)**:
   - 每次有实质性题目变动（如增删选项、新增题目流程），必须修改 `index.html` 提交逻辑中的 `surveyVersion` 字段（例如从 `2026.06.emoji_painpoint_v2` 升至 `_v3`）。
   - **原因**：由于后台数据库是 JSON 格式，升级版本号可以在大屏筛选数据时，避免新老格式数据混杂导致图表统计错误，旧数据将永久保留但逻辑上与新版本隔离。
2. **前后端字典同步 (Dictionary Sync)**:
   - 如果你在问卷前端 (`index.html`) 增加了一个全新的 value（例如 `puppy_love`），必须**同步**前往 Dashboard (`dashboard/index.html`) 的映射字典（如 `SCENARIO_MAP` 等）中添加对应的中文翻译。否则图表将显示 undefined。
3. **结构完整性**:
   - 调整题目顺序时，必须严格检查前后逻辑动画的 `goToSlide()` 索引下标，防止出现死循环或跳跃错误。

---

## 三、 数据大屏更新规范 (Dashboard Updates) - ⚠️ 核心事故防范

过去的血泪教训表明，“无法拉取数据”的弹窗 90% 不是网络问题，而是**隐藏的前端 DOM 渲染崩溃**导致的。

1. **HTML 与 JS 必须成对出现 (DOM Integrity)**:
   - 任何在 JavaScript 中通过 `document.getElementById('xxx')` 获取图表画布 (`<canvas>`) 或表格节点 (`<tbody>`) 的行为，**必须**确保在 HTML 结构中真实存在该节点。
   - **严禁**：只写了图表渲染逻辑 JS，却漏写了 HTML 标签。这会导致 `null` 异常。
   - **影响**：由于大屏的渲染逻辑包裹在 `try...catch` 的数据请求代码块中，哪怕只是一个图表找不到画布，都会引发整体崩溃，并被捕捉为假性“网络请求失败”。
2. **强制穿透缓存 (Cache Busting)**:
   - 前端大屏在向 `api-proxy` 拉取数据时，Fetch API 的 URL 必须携带 `?t=时间戳` 或强缓存控制头。
   - **原因**：Cloudflare Edge CDN 经常会激进地缓存 `GET` 请求，如果不加时间戳，用户可能长达数小时看不到最新的问卷结果提交。
3. **安全可选链调用 (Optional Chaining)**:
   - 获取 JSON 深层数据时，必须使用可选链（例如 `row.data?.answers?.emojis || []`），防止历史废弃数据缺少该字段导致 JS 报错。

---

## 四、 部署发布规范 (Deployment Protocol)

因为本项目没有绑定 GitHub CI/CD 自动构建，所有发布必须通过本地 CLI 手动直传 Cloudflare 边缘节点。

1. **全量目录发布**:
   - 当修改了问卷 (`index.html`) 或 大屏 (`dashboard/index.html`) 时，必须在 `web/` 目录下执行全量发布命令：
   - `npx wrangler pages deploy public/survey --project-name re-think-survey --branch=main`
   - *注：Dashboard 是作为子目录存放在 survey 根目录下的，发布根目录即可同时更新两者。*
2. **代理层发布**:
   - 若修改了 `api-proxy/_worker.js`，必须在项目根目录执行：
   - `npx wrangler pages deploy api-proxy --project-name api-proxy --branch=main`
3. **发布后强制验证**:
   - 部署完成后，开发者必须在无痕浏览器模式下，或在链接后加上 `?v=版本号` 访问生产环境，确认一切渲染正常，排除 Cloudflare 缓存干扰。
