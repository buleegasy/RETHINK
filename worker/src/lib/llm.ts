import OpenAI from 'openai';
import type { Env, ChatMessage, FSMState, UserProfile } from '../types';
import type { IntentType } from './intent-router';
import type { RAGContext } from './rag';
import { formatRAGContext } from './rag';
import { getPromptForState } from './fsm';

// ============================================================
// System Prompt 模块化组件
// ============================================================

/**
 * 角色定义 — 完整版（用于 emotional / ambiguous）
 */
const ROLE_FULL = `你是一个基于认知行为疗法（CBT）的思维重塑系统。你的性格是专业且懂变通的心理医生。

你的工作流必须遵循以下 CBT 五阶段（每次只推进一步）：
1. 剥离事实：了解客观发生了什么。
2. 捕获想法：挖掘用户对该事件的自动思维和主观解读。
3. 扫描漏洞：温和地探讨这些想法中的逻辑谬误（如非黑即白、灾难化）。
4. 证据质询：寻找支持或反驳这些想法的客观证据。
5. 重构认知：引导用户建立更平衡、更适应性的新认知。`;

/**
 * 角色定义 — 精简版（用于 casual）
 */
const ROLE_CASUAL = `你是一个温暖、有亲和力的心理支持伙伴。你正在与用户进行轻松的日常对话。
用自然、亲切的语气回应，就像一个关心对方的好朋友。不需要进行心理分析或 CBT 流程。`;

/**
 * 角色定义 — 危机版（用于 crisis）
 */
const ROLE_CRISIS = `你是一个专业的心理危机支持人员。当前用户可能正处于严重的心理危机中。

你的最高优先级是：
1. 保持冷静、温暖、不评判的态度
2. 表达真诚的关心和理解
3. 评估用户当前的安全状态
4. 鼓励用户寻求专业帮助
5. 提供心理援助热线：全国心理援助热线 400-161-9995，北京心理危机研究与干预中心 010-82951332
6. 如果用户表示正在实施自伤行为，立即引导其拨打 120 或联系身边的人

严禁使用 CBT 分析流程，严禁追问细节，严禁评判。你唯一的目标是让用户感到被听见、被理解、被关心。`;

/**
 * 情感兜底逻辑（所有模式通用）
 */
const EMOTIONAL_SAFETY_NET = `
【最高优先级强制指令】：
你必须像真实人类一样说话。当你识别到用户情绪崩溃、极度自责或悲伤时，必须【立即暂停】冷冰冰的逻辑推演，优先给予真诚的安慰和情感支撑。只有当用户情绪平复后，才能用温暖、包容的话术，温柔地引导他们回到事实与逻辑的梳理上。`;

/**
 * 输出格式规范 — 电影级 JSON 联动版
 */
const OUTPUT_FORMAT_JSON = `
【🔴 强制输出格式规范 - 必须返回合法 JSON 对象】：
你必须将回复封装在以下 JSON 结构中，严禁包含任何 JSON 以外的文字、Markdown 标记或括号注释：

{
  "state_machine": "当前所处的状态节点名称",
  "agent_reply": "你的心理干预回复文本（纯台词，严禁旁白）",
  "ui_control": {
    "color_theme": "对应的颜色代码（如 #0A1128）",
    "lighting_style": "光影质感描述（如 soft_ambient）",
    "transition_speed": "渐变速度（如 5000ms）",
    "effect": "视觉特效描述（如 slow_breathing）"
  }
}

【⚠️ 严禁事项】：
1. 严禁在 JSON 字段内使用括号动作描写（如"(递纸巾)"）。
2. 严禁输出任何 JSON 结构之外的文字说明。
3. 确保 JSON 格式合法，特殊字符需正确转义。`;

/**
 * 电影级色彩心理学规则
 */
const CINEMATIC_UI_RULES = `
【🎨 电影级色彩心理学与 UI 联动规则】：
请根据用户当前的情绪状态，在 ui_control 中选择最合适的视觉方案：

1. **焦虑/恐慌 (Anxiety)** -> 镇静冷色调 (Deep Interstellar Blue)
   - 目的：降低视觉刺激，减缓心率。
   - 参数：color_theme: "#0A1128", lighting_style: "soft_ambient", transition_speed: "5000ms", effect: "slow_breathing"

2. **抑郁/低落 (Depression)** -> 晨光高动态暖色 (Sunrise Gold)
   - 目的：行为激活，提升能量感。
   - 参数：color_theme: "#E27D60", lighting_style: "golden_hour_bloom", transition_speed: "3000ms", effect: "warm_glow"

3. **愤怒/暴躁 (Anger)** -> 莫兰迪自然色 (Sage Green)
   - 目的：吸收攻击性，提供视觉缓冲。
   - 参数：color_theme: "#8A9A5B", lighting_style: "diffused_matte", transition_speed: "4000ms", effect: "static_noise_reduction"

4. **中性/其他 (Neutral)**
   - 参数：color_theme: "#F8F9FA", lighting_style: "neutral_daylight", transition_speed: "2000ms", effect: "none"`;

/**
 * 交互风格要求
 */
const INTERACTION_STYLE = `
交互要求：
- 每次回复简短、聚焦。
- 用温暖、接纳的语气。
- 如果用户正在崩溃，先抱抱他们，再说其他的。`;

// ============================================================
// Prompt 构建函数
// ============================================================

/**
 * 根据意图类型和 RAG 上下文构建 System Prompt
 * 
 * | 模块              | casual | emotional | crisis | ambiguous |
 * |-------------------|--------|-----------|--------|-----------|
 * | 角色定义          | 精简版 | 完整版    | 危机版 | 完整版    |
 * | 情感兜底          | ✅     | ✅        | ✅强化  | ✅       |
 * | 输出格式          | ✅     | ✅        | ✅     | ✅       |
 * | 交互风格          | ✅     | ✅        | ✅     | ✅       |
 * | RAG 知识片段      | ❌     | ✅注入    | ❌     | ❌       |
 */
export function buildSystemPrompt(
  intent: IntentType,
  ragContext?: RAGContext
): string {
  const parts: string[] = [];

  // 1. 角色定义
  switch (intent) {
    case 'casual':
      parts.push(ROLE_CASUAL);
      break;
    case 'crisis':
      parts.push(ROLE_CRISIS);
      break;
    case 'emotional':
    case 'ambiguous':
    default:
      parts.push(ROLE_FULL);
      break;
  }

  // 2. 情感兜底
  parts.push(EMOTIONAL_SAFETY_NET);

  // 3. 交互风格
  parts.push(INTERACTION_STYLE);

  // 4. RAG 知识注入（仅 emotional 模式）
  if (intent === 'emotional' && ragContext) {
    const ragText = formatRAGContext(ragContext);
    if (ragText) {
      parts.push(ragText);
    }
  }

  // 5. 输出格式规范（放在最后以强化遵从）
  parts.push(OUTPUT_FORMAT_JSON);

  return parts.join('\n');
}

// ============================================================
// FSM 版本 — 根据状态机状态构建 Prompt
// ============================================================

/**
 * 根据 FSM 状态和 RAG 上下文构建 System Prompt
 *
 * 与旧版 buildSystemPrompt 的区别：
 *   - 角色定义来自 FSM 状态专属 Prompt（而非 intent 分支）
 *   - Crisis 状态下完全覆盖，不注入 RAG
 */
export function buildSystemPromptFSM(
  fsmState: FSMState,
  ragContext?: RAGContext,
  profile?: UserProfile,
  facialEmotion?: { label: string; labelZh: string; confidence: number },
): string {
  const parts: string[] = [];

  // 1. FSM 状态专属角色定义 + 任务指令
  parts.push(getPromptForState(fsmState));

  // 1.1 注入用户画像 (Onboarding Anchoring)
  if (profile) {
    const profileText = `
【重要：已掌握的用户初始画像】
- 当前心理天气：${profile.weather === 'Storm' ? '暴雨（极度不安）' : profile.weather === 'Thunder' ? '雷暴（愤怒/冲突）' : profile.weather === 'Fog' ? '大雾（迷茫/困惑）' : '晴天（相对平静）'}
- 安全岛偏好：${profile.safetyIsland === 'Arcade' ? '赛博朋克电玩城（喜欢游戏化隐喻、快节奏交互）' : profile.safetyIsland === 'DeepSea' ? '宁静深海（需要极度静谧、包容的语气）' : '阳光音乐节现场（需要活力、音乐相关的行为激活）'}
- 核心压力源：${profile.stressor === 'Academic' ? '学业压力（成绩单、竞争）' : profile.stressor === 'SelfEsteem' ? '自我认同（自尊心、自我价值）' : '同伴关系（社交冲突、孤独感）'}

【指令】：请在你的第一句话中，巧妙地运用上述信息。不要像填表一样罗列，而是将其融入你的共情中。例如，如果用户选了“大雾”和“电玩城”，你可以说：“我感觉到你现在周围似乎起了一场大雾，让你看不清方向。没关系，我们就把它当成一场高难度的解谜游戏，我会陪你一起寻找通往下一关的线索。”`;
    parts.push(profileText);
  }

  // 1.2 注入摄像头情绪感知（Facial Emotion Anchoring）
  if (facialEmotion && facialEmotion.label !== 'neutral') {
    const emotionText = `
【📷 摄像头情绪感知（实时监测）】
摄像头面部情绪分析检测到：用户当前面部情绪为「${facialEmotion.labelZh}」（置信度 ${facialEmotion.confidence}%）。

【指令】：这是对话的辅助参考，不要直接告诉用户"我看到你在哭"这样的话。而是将其融入共情中，如果情绪和用户文字内容存在冒符（如说没事却检测到悲伤情绪），可以温和地评论它。最高优先级是情绪安全，而非暴露分析结果。`;
    parts.push(emotionText);
  }

  // 2. 情感兜底（Crisis 已内置，但额外强化不会有副作用）
  parts.push(EMOTIONAL_SAFETY_NET);

  // 3. 交互风格
  parts.push(INTERACTION_STYLE);

  // 4. RAG 知识注入（仅 CBT_Stripping 和 Socratic_Questioning 注入）
  if (
    (fsmState === 'CBT_Stripping' || fsmState === 'Socratic_Questioning') &&
    ragContext
  ) {
    const ragText = formatRAGContext(ragContext);
    if (ragText) {
      parts.push(ragText);
    }
  }

  // 5. 电影级 UI 规则
  parts.push(CINEMATIC_UI_RULES);

  // 6. 输出格式规范
  parts.push(OUTPUT_FORMAT_JSON);

  return parts.join('\n');
}

// ============================================================
// LLM 客户端
// ============================================================

export function getLLMClient(env: Env) {
  // OpenRouter API（兼容 OpenAI SDK）
  return new OpenAI({
    apiKey: env.API_KEY,
    baseURL: env.API_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://re-think-agent.pages.dev',
      'X-Title': 'RE-THINK Agent',
    },
  });
}

/**
 * 获取默认模型名称
 */
export function getModelName(env: Env, requestedModel?: string): string {
  if (requestedModel === 'llama-3.4') return 'meta-llama/Llama-3.3-70B-Instruct'; // 使用典型的 70B
  if (requestedModel === 'deepseek-v3') return 'deepseek-ai/DeepSeek-V3';
  return env.MODEL_NAME || 'meta-llama/llama-4-maverick';
}

/**
 * 调用大模型（流式）
 */
export async function createChatStream(
  env: Env,
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  requestedModel?: string
): Promise<string> {
  const client = getLLMClient(env);
  const model = getModelName(env, requestedModel);

  // 组装最终请求的 messages 列表
  const systemMessage: ChatMessage = { role: 'system', content: systemPrompt };
  const payloadMessages = [systemMessage, ...messages];

  let fullContent = '';

  try {
    const stream = await client.chat.completions.create({
      model: model,
      messages: payloadMessages,
      stream: true,
      temperature: 0.6,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        onChunk(delta);
      }
    }
    return fullContent;
  } catch (error) {
    console.error('LLM API Error:', error);
    throw new Error('对话请求失败，请检查 API 配置或网络。');
  }
}

/**
 * 调用大模型（非流式）
 */
export async function createChatCompletion(
  env: Env,
  messages: ChatMessage[],
  systemPrompt: string,
  requestedModel?: string
): Promise<string> {
  const client = getLLMClient(env);
  const model = getModelName(env, requestedModel);

  const systemMessage: ChatMessage = { role: 'system', content: systemPrompt };
  const payloadMessages = [systemMessage, ...messages];

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: payloadMessages,
      stream: false,
      temperature: 0.6,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('LLM API Error:', error);
    throw new Error('对话请求失败，请检查 API 配置或网络。');
  }
}
