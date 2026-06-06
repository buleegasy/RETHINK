# Original User Request

## Initial Request — 2026-06-06T18:19:48+08:00

基于认知行为疗法（CBT）与行为激活（BA）理论，系统地搜索、编写并整合权威的青少年情绪缓解与微习惯干预文件，构建适用于 RAG 检索的结构化知识库，并编写自动化脚本进行检索准确性验证。

Working directory: /Users/chenhaoran/Documents/心理竞赛
Integrity mode: development

## Requirements

### R1. 编写专业的 CBT 行为激活微习惯指南
- 编写权威的 Markdown 知识库文档，针对青少年最敏感的 4 大压力域（学业、同伴关系、自卑内耗、深夜低落）设计 0 门槛的躯体行为激活处方。
- 指南内容必须专业且临床可信（参考 Beck CBT 理论及 C-SSRS 危机分类），提供可由 RAG 精准分块召回的结构化格式。

### R2. 知识库自动化导入
- 自动将编写的指南文本导入至项目当前绑定的 Vectorize 向量知识库（可通过调用 `http://localhost:8787/api/knowledge/ingest` 或直接与本地 D1 / Vectorize 接口对接）。

### R3. 自动化向量检索质量测试与校验
- 编写测试脚本 `test-behavior-activation-rag.ts`，模拟 5 种典型青少年诉求场景（学术崩溃、社交孤立、极度自卑、深夜虚无、否定句抗拒）。
- 脚本应能对 Vectorize 发起检索，断言召回片段的精准度，确保召回的微习惯确实与用户的压力源维度（Academic/SelfEsteem/Relationship/Depression）相匹配，且检索相似度分数不得低于 0.55。

## Acceptance Criteria

### 文档专业度与完整性
- [ ] 知识库文档包含针对 4 大压力域的完整干预行动，每项行动均有明确的耗时、步骤及神经自主系统调节机制说明。
- [ ] 文档格式为符合分块器读取的 Markdown 结构（含清晰的 H2 二级标题与关键词标注）。

### 知识库导入与质量校验
- [ ] 测试脚本能成功跑通 5 个测试用例，输出召回的知识片段标题、相关度得分和耗时。
- [ ] 所有测试用例在 Vectorize 中的检索召回匹配度为 100%（即针对学业问题必须匹配学业习惯，社交问题必须匹配社交习惯）。
- [ ] 测试脚本能够通过本地 `npx tsx` 无错运行。
