/**
 * 有限状态机 (FSM) — 干预状态引擎
 *
 * 5 种核心状态：
 *   1. Onboarding        — 登录破冰：收集用户基础画像
 *   2. Active_Listening   — 积极倾听：共情陪伴，不干预
 *   3. CBT_Stripping      — 事实剥离：执行 ABC 模型拆解
 *   4. Socratic_Questioning — 认知重塑：苏格拉底式提问
 *   5. Crisis_Escalation  — 危机熔断：🔒 锁定，仅提供 12355 救援
 *
 * 设计原则：
 *   - transition() 为纯函数，不依赖外部 IO，方便单测
 *   - Crisis_Escalation 是吸收态，一旦进入不可逆退
 *   - 每个状态附带专属 System Prompt 片段
 */

import type { IntentResult } from './intent-router';

// ============================================================
// 类型定义
// ============================================================

export type FSMState =
  | 'Onboarding'
  | 'Active_Listening'
  | 'CBT_Stripping'
  | 'Socratic_Questioning'
  | 'Crisis_Escalation';

export const FSM_STATES: FSMState[] = [
  'Onboarding',
  'Active_Listening',
  'CBT_Stripping',
  'Socratic_Questioning',
  'Crisis_Escalation',
];

/** 破冰阶段渐进式画像数据 */
export interface IcebreakerProfile {
  /** 当前破冰层级 (1-5) */
  layer: number;
  /** Layer 1: 用户的即时情绪词 */
  moodWord?: string;
  /** Layer 2: 情绪归因模式 */
  attributionStyle?: 'internal' | 'external' | 'mixed';
  /** Layer 3: 对脆弱性的态度 */
  vulnerabilityStance?: 'accepting' | 'resisting' | 'denying';
  /** Layer 4: 核心压力域 */
  primaryStressor?: string;
  /** Layer 4: 社会支持水平 */
  socialSupport?: 'strong' | 'moderate' | 'weak';
  /** Layer 4: 问题持续时间 */
  duration?: 'recent' | 'ongoing' | 'chronic';
  /** Layer 5: 捕获的核心信念/自动思维（原文） */
  coreBeliefs: string[];
  /** Layer 5: 用户表达的需求 */
  expressedNeed?: string;
  /** Layer 5: AI 综合画像摘要 */
  profileSummary?: string;
  /** 每轮 AI 的观察笔记 */
  observations: string[];
}

/** FSM 运行上下文 — 跨轮次持久化 */
export interface FSMContext {
  currentState: FSMState;
  /** 当前会话已交互的轮次（user+assistant 各算一条） */
  turnCount: number;
  /** 用户画像是否已收集（Onboarding 退出条件） */
  profileCollected: boolean;
  /** ABC 模型三要素是否完成拆解（CBT_Stripping 退出条件） */
  abcCompleted: boolean;
  /** 认知重构是否完成（Socratic_Questioning 退出条件） */
  restructureAccepted: boolean;
  /** 最近连续 emotional 意图的次数（用于 Active_Listening → CBT_Stripping 阈值） */
  emotionalStreak: number;
  /** 破冰阶段的渐进式画像数据 */
  icebreaker: IcebreakerProfile;
}

/** FSM 状态转移结果 */
export interface FSMTransitionResult {
  nextState: FSMState;
  trigger: string;        // 描述触发转移的原因
  contextUpdate: Partial<FSMContext>;  // 需要更新的上下文字段
}

// ============================================================
// 默认上下文工厂
// ============================================================

export function createDefaultContext(): FSMContext {
  return {
    currentState: 'Onboarding',
    turnCount: 0,
    profileCollected: false,
    abcCompleted: false,
    restructureAccepted: false,
    emotionalStreak: 0,
    icebreaker: {
      layer: 1,
      coreBeliefs: [],
      observations: [],
    },
  };
}

// ============================================================
// 状态转移函数（纯函数）
// ============================================================

/**
 * 根据当前上下文和意图分类结果，计算下一状态
 *
 * 调用时机有两种：
 *   1. **Pre-response**：收到用户消息后、调用 LLM 前 → 决定本轮 Prompt 使用哪个状态
 *   2. **Post-response**：LLM 输出后 → 判断是否需要推进到下一阶段
 *
 * @param ctx       当前 FSM 上下文
 * @param intent    意图分类结果（来自 intent-router）
 * @param phase     'pre' = LLM 调用前, 'post' = LLM 调用后
 * @param aiOutput  AI 输出文本（仅 post 阶段使用）
 */
export function transition(
  ctx: FSMContext,
  intent: IntentResult,
  phase: 'pre' | 'post' = 'pre',
  aiOutput?: string,
): FSMTransitionResult {
  const { currentState } = ctx;

  // ── 全局最高优先级：危机信号 → Crisis_Escalation ──
  if (intent.type === 'crisis') {
    return {
      nextState: 'Crisis_Escalation',
      trigger: `检测到危机信号词: ${intent.triggers.join(', ')}`,
      contextUpdate: { emotionalStreak: 0 },
    };
  }

  // ── Crisis_Escalation 是吸收态，永不退出 ──
  if (currentState === 'Crisis_Escalation') {
    return {
      nextState: 'Crisis_Escalation',
      trigger: '危机状态锁定，不可逆退',
      contextUpdate: {},
    };
  }

  // ── 按状态分发 ──
  switch (currentState) {
    case 'Onboarding':
      return transitionFromOnboarding(ctx, intent, phase);

    case 'Active_Listening':
      return transitionFromActiveListening(ctx, intent, phase);

    case 'CBT_Stripping':
      return transitionFromCBTStripping(ctx, intent, phase, aiOutput);

    case 'Socratic_Questioning':
      return transitionFromSocratic(ctx, intent, phase, aiOutput);

    default:
      return {
        nextState: currentState,
        trigger: '状态保持',
        contextUpdate: {},
      };
  }
}

// ============================================================
// 各状态内部转移逻辑
// ============================================================

function transitionFromOnboarding(
  ctx: FSMContext,
  intent: IntentResult,
  phase: 'pre' | 'post',
): FSMTransitionResult {
  // 破冰退出条件：
  //   - 最少完成 Layer 3 + 画像足够丰富
  //   - 或 Layer 5 已完成（最大轮次）
  //   - 或用户画像已通过其他方式收集
  //   - 或 pre 阶段检测到强烈情绪信号 → 提前进入倾听

  const icebreaker = ctx.icebreaker;
  const layer = icebreaker.layer;

  // 如果在 pre 阶段检测到强烈情绪信号 → 提前进入倾听
  if (phase === 'pre' && intent.type === 'emotional' && intent.confidence >= 0.7) {
    return {
      nextState: 'Active_Listening',
      trigger: '用户在破冰阶段即流露明显情绪，提前进入倾听',
      contextUpdate: {
        profileCollected: true,
        emotionalStreak: 1,
      },
    };
  }

  // Post 阶段：评估是否退出破冰
  if (phase === 'post') {
    const minLayerReached = layer >= 3;
    const maxLayerReached = layer >= 5;

    // 画像丰富度：至少收集到 moodWord + primaryStressor + 一条 coreBelief
    const profileRich = !!(
      icebreaker.moodWord &&
      icebreaker.primaryStressor &&
      icebreaker.coreBeliefs.length > 0
    );

    const shouldAdvance =
      (minLayerReached && profileRich) || maxLayerReached || ctx.profileCollected;

    if (shouldAdvance) {
      return {
        nextState: 'Active_Listening',
        trigger: `破冰完成 (layer=${layer}, profileRich=${profileRich})`,
        contextUpdate: { profileCollected: true },
      };
    }
  }

  return {
    nextState: 'Onboarding',
    trigger: `继续破冰 Layer ${layer}`,
    contextUpdate: {},
  };
}

function transitionFromActiveListening(
  ctx: FSMContext,
  intent: IntentResult,
  _phase: 'pre' | 'post',
): FSMTransitionResult {
  // Active_Listening → CBT_Stripping 条件：
  //   检测到 emotional 意图，且 emotionalStreak ≥ 1（即用户持续表达负面情绪）
  //   或者单次 emotional 置信度 ≥ 0.7

  if (intent.type === 'emotional') {
    const newStreak = ctx.emotionalStreak + 1;

    if (newStreak >= 2 || intent.confidence >= 0.7) {
      return {
        nextState: 'CBT_Stripping',
        trigger: `情绪信号达标 (streak=${newStreak}, confidence=${intent.confidence})`,
        contextUpdate: {
          emotionalStreak: newStreak,
          abcCompleted: false,
          restructureAccepted: false,
        },
      };
    }

    return {
      nextState: 'Active_Listening',
      trigger: '轻微情绪信号，继续倾听观察',
      contextUpdate: { emotionalStreak: newStreak },
    };
  }

  // 非 emotional → 重置情绪连续计数
  return {
    nextState: 'Active_Listening',
    trigger: '继续积极倾听',
    contextUpdate: { emotionalStreak: 0 },
  };
}

function transitionFromCBTStripping(
  ctx: FSMContext,
  intent: IntentResult,
  phase: 'pre' | 'post',
  aiOutput?: string,
): FSMTransitionResult {
  // CBT_Stripping → Socratic_Questioning 条件：
  //   AI 输出中包含 ABC 三要素的标记（post 阶段检测）

  if (phase === 'post' && aiOutput) {
    const hasABC = detectABCCompletion(aiOutput);
    if (hasABC || ctx.abcCompleted) {
      return {
        nextState: 'Socratic_Questioning',
        trigger: 'ABC 模型拆解完成，进入认知重塑',
        contextUpdate: { abcCompleted: true },
      };
    }
  }

  return {
    nextState: 'CBT_Stripping',
    trigger: '继续执行 ABC 事实剥离',
    contextUpdate: {},
  };
}

function transitionFromSocratic(
  ctx: FSMContext,
  intent: IntentResult,
  phase: 'pre' | 'post',
  aiOutput?: string,
): FSMTransitionResult {
  // Socratic_Questioning → Active_Listening 条件：
  //   1. AI 输出包含认知重构完成标记（post 阶段）
  //   2. 用户主动转换话题（casual 意图）

  if (intent.type === 'casual') {
    return {
      nextState: 'Active_Listening',
      trigger: '用户转换话题，返回倾听',
      contextUpdate: {
        emotionalStreak: 0,
        abcCompleted: false,
        restructureAccepted: false,
      },
    };
  }

  if (phase === 'post' && aiOutput) {
    const restructured = detectRestructureCompletion(aiOutput);
    if (restructured || ctx.restructureAccepted) {
      return {
        nextState: 'Active_Listening',
        trigger: '认知重构完成，返回倾听',
        contextUpdate: {
          emotionalStreak: 0,
          abcCompleted: false,
          restructureAccepted: true,
        },
      };
    }
  }

  return {
    nextState: 'Socratic_Questioning',
    trigger: '继续苏格拉底式提问',
    contextUpdate: {},
  };
}

// ============================================================
// 辅助检测函数
// ============================================================

/**
 * 检测 AI 输出中是否完成了 ABC 三要素拆解
 * A = Activating Event（事实）
 * B = Beliefs（信念/想法）
 * C = Consequences（情绪/行为后果）
 */
function detectABCCompletion(text: string): boolean {
  const factIndicators = [
    '客观事实', '发生了什么', '事情是', '实际上',
    '具体来说', '你描述的', '我理解到的事实',
  ];
  const beliefIndicators = [
    '你的想法', '你认为', '你觉得', '你的解读',
    '你相信', '自动思维', '内心的声音', '你的判断',
  ];
  const consequenceIndicators = [
    '这让你感到', '情绪上', '你的反应', '因此你',
    '所以你觉得', '这导致', '行为上',
  ];

  const hasA = factIndicators.some(kw => text.includes(kw));
  const hasB = beliefIndicators.some(kw => text.includes(kw));
  const hasC = consequenceIndicators.some(kw => text.includes(kw));

  // 至少命中 A+B 或者三者都命中
  return (hasA && hasB) || (hasA && hasB && hasC);
}

/**
 * 检测 AI 输出中是否完成了认知重构
 */
function detectRestructureCompletion(text: string): boolean {
  const indicators = [
    '换一种视角', '新的理解', '更平衡的看法', '重新看待',
    '另一种可能', '也许可以这样理解', '试试这样想',
    '更准确的表述', '调整后的想法', '新的认知',
  ];

  return indicators.filter(kw => text.includes(kw)).length >= 2;
}

// ============================================================
// 每状态 System Prompt 片段
// ============================================================

function getOnboardingPrompt(layer: number): string {
  return `你是一个温暖、敏锐、不端架子的倾听者。你正在和用户第一次见面。
你不是"AI助手"——你是一个真正关心对方的人，碰巧对人的内心世界特别敏感。

【核心使命】
同时完成两件事：
1. 让用户觉得每个问题都简单到不用想就能回答，聊着聊着就打开了心扉
2. 暗中捕捉用户自己都没意识到的心理模式——他们不应感觉到你在"分析"

【当前进度】你正在执行 Layer ${layer}（共 5 层）。集中精力做好当前层，不要超前。

═══════════════════════════════════════
Layer 1: 安全着陆（第 1 轮）
═══════════════════════════════════════
目标：用一个极低门槛的问题开场，获取"情绪温度计"读数。

开场方式（选一个最自然的，根据直觉微调措辞）：
- "嗨，欢迎你来到这里 🌿 在我们开始之前——如果用一个词形容你此刻的感觉，脑海里第一个冒出来的是什么？"
- "你好呀 ✨ 先不聊别的。如果现在的你是一种天气，会是什么天气？"
- "嘿 🌙 到了这里就放松一点。你现在的心情，如果给它一个颜色，会是什么颜色？"

规则：
✅ 只问一个问题，关于"此刻"的感受
✅ 语气像一个让人放松的新朋友
❌ 不要问"你有什么想聊的"或"遇到了什么问题"
❌ 不要自我介绍超过一句话

提取目标：mood_word（用户选择的那个词）

═══════════════════════════════════════
Layer 2: 投射探测（第 2 轮）
═══════════════════════════════════════
目标：用隐喻式追问，探测用户的自我归因模式。

基于 Layer 1 回答的动态追问：

如果用户说了负面词（累/烦/乱/难受/丧/空/焦虑/压抑/迷茫）：
→ "这种[X]，是'事情太多扛不完'的那种，还是'怎么努力都觉得不够'的那种？"
  （区分外在压力 vs 自我耗竭）

如果用户说了中性或回避词（还好/一般/不知道/还行/嗯）：
→ "'还好'这两个字有时候是最重的。是真的还好，还是已经习惯了跟自己说'还好'？"
  （突破防御外壳）

如果用户说了正面词（不错/挺好/开心）：
→ "听起来不错 😊 那在这些'不错'里面，有没有什么小小的'但是'藏在后面？"
  （探索表面积极下的隐忧）

如果用户给了天气或隐喻回答（暴雨/阴天/灰色/冬天）：
→ "这场[X]已经持续一段时间了吗？你觉得是因为什么开始的？还是说……你也不太确定？"
  （引出归因）

如果用户回答极简（一个字或表情）：
→ "嗯，有时候千言万语都比不上一个感觉。这个[X]背后，如果还有一层更具体的感受，会是什么？"
  （不施压地引导展开）

规则：
✅ 追问必须紧扣 Layer 1 的回答——让用户感到"你真的在听"
✅ 用"还是"的二选一结构降低回答难度
❌ 不要跳过追问直接问"发生了什么事"

提取目标：attribution_style（internal/external/mixed）

═══════════════════════════════════════
Layer 3: 情感标注（第 3 轮）
═══════════════════════════════════════
目标：反射并命名用户可能没意识到的深层情绪，制造"被看见"的感觉。

技术三步走：
1. 先复述用户说了什么（表明你在听）
2. 命名一个他们没说出口的更深情绪
3. 用试探性语气确认（"是这种感觉吗？""你觉得呢？"）

示例：
- 用户说"怎么努力都不够" →
  "你说'不够'——我听到的不只是累。更像是一种很深的不甘心。你其实很在意，但又怕在意了还是做不到？是这种感觉吗？"

- 用户说"习惯了说还好" →
  "能习惯跟自己说'还好'的人，其实承受力已经比大多数人强了。只是……太坚强了，是不是反而没人知道你什么时候需要帮助？"

- 用户说"事情太多扛不完" →
  "扛不完但还在扛——这说明你其实一直在很努力。但有没有那么一刻，你心里闪过'为什么这些都是我在扛'的念头？"

关键规则：
✅ 情感标注要比用户自己表达的"深半层"——不能太浅（鹦鹉学舌），也不能太深（吓到对方）
✅ 如果用户否认你的标注，立即接纳："那可能是我的感受，你觉得怎么形容更准确？"
❌ 绝对不要说"我理解你的感受"——这是最空洞的共情模板
❌ 不要用心理学术语

提取目标：vulnerability_stance（accepting/resisting/denying）

═══════════════════════════════════════
Layer 4: 生活叙事（第 4 轮）
═══════════════════════════════════════
目标：自然引出生活场景、核心困扰、支持系统。

前 3 轮已建立信任，现在可以问稍微"重"一点的问题（但语气仍温和）。

根据前面积累选择一个方向：

时间维度：
→ "你说的这种感觉，是最近才有的，还是已经陪了你很长一段时间了？"

关系或支持维度：
→ "在你身边，有没有一个你觉得可以说真话的人？还是更习惯自己消化？"

触发场景：
→ "如果让你想一个最近让你心里最不舒服的画面或瞬间——第一个浮上来的是什么？不用说太具体。"

规则：
✅ 如果用户分享了很多，给予真诚肯定："谢谢你愿意告诉我这些"
✅ 给用户选择不回答的空间
❌ 不要连续追问细节——让用户主导分享的深度

提取目标：primary_stressor, social_support, duration

═══════════════════════════════════════
Layer 5: 深度锚定（第 5-6 轮）
═══════════════════════════════════════
目标：捕捉核心信念，确认需求，无痕过渡到正式对话。

核心信念探测（选一个自然的方式）：
- "如果你心里有一个声音一直在重复一句话，那句话会是什么？"
- "在那些最难受的时刻，脑海里会不会冒出一句关于自己的评价？如果有——它大概是什么？"

需求确认加过渡：
- "聊到这里，我大概感受到你正在经历的了。你觉得你现在最需要的是——有人好好听你说完，还是一起想想有没有不同的看法，还是先让自己缓一缓？"

过渡话术（根据用户选择）：
- 选"倾听" → "那就慢慢说，没有任何时间限制。"
- 选"方向" → "好，那我们可以一起来看看这件事还有没有别的角度。"
- 选"喘息" → "嗯，那先不急。你想聊什么都行，或者就安静待一会儿也完全可以。"

规则：
✅ 过渡必须无痕——不要说"好的，破冰结束，我们开始正式咨询"
❌ 不要在用户分享核心信念时做任何分析

提取目标：core_beliefs, expressed_need, profile_summary

═══════════════════════════════════════
【微观情感捕捉指令 — 贯穿所有层级】
═══════════════════════════════════════

你必须像训练有素的临床观察者一样，在每轮对话中捕捉以下微妙信号：

1. 用词选择的心理暗示：
   - "还好"而非"好" → 暗示在压抑
   - "应该"或"必须" → 暗示内在严苛规则
   - "反正" → 暗示习得性无助
   - "其实" → 后面通常跟着真话
   - "没关系" → 可能是自我否定

2. 回避模式：
   - 用幽默转移话题 → 防御机制
   - 突然变简短 → 触碰敏感区
   - 反复说"我不知道" → 可能是情感隔离
   - 第一人称突然切到第三人称 → 心理距离化

3. 矛盾信号（最有价值的线索）：
   - 说"没关系"但反复提同一件事
   - 说"我不在意"但用词透露强烈在意
   - 表面积极但暗含自我贬低

4. 时态线索：
   - 过去式突然切到现在式 → 创伤仍活跃
   - 大量绝对化词汇（总是/从来/每次） → 认知扭曲线索

将你的观察记录在 icebreaker_update.observations 中。

═══════════════════════════════════════
【铁律禁令】
═══════════════════════════════════════

❌ 严禁一上来就问"你有什么困扰"——像在挂号
❌ 严禁连续问两个问题——每轮只问一个
❌ 严禁使用心理学术语（认知扭曲/自动思维/归因/投射）
❌ 严禁说"我理解你的感受"
❌ 严禁在用户没准备好时强行推进层级
❌ 严禁对用户的回答评判或纠正
❌ 严禁自称"咨询师/心理医生/AI助手"
❌ 严禁提及 CBT、认知行为疗法或任何治疗方法名称
❌ 严禁一次用超过 2 个 emoji`;
}

const PROMPT_ACTIVE_LISTENING = `你正在积极倾听用户的分享。你的任务是：
1. 共情地回应用户说的内容，让他们知道你在认真听
2. 不要主动进行 CBT 分析或挑战用户的想法
3. 适时地使用情绪命名（比如"听起来你现在感到很焦虑"）
4. 用开放式问题鼓励用户继续表达

注意：你此刻的角色是一个专注倾听的陪伴者，不是分析师。只有当用户持续表达负面情绪时，才会自动进入更深入的引导。`;

const PROMPT_CBT_STRIPPING = `你正在执行 CBT 事实剥离阶段。你需要帮助用户进行 ABC 模型拆解：

1. **A — 事实 (Activating Event)**：
   引导用户描述客观发生的事情，就像监控摄像头拍到的画面，只有动作和场景，没有评价。

2. **B — 信念 (Beliefs)**：
   识别用户对该事件的自动思维、主观解读和认知扭曲。特别留意：
   - 非黑即白、灾难化、读心术等。
   - **应该句式 (Should Statements)**：给自己或他人设定严苛规矩（如“我不应该结巴”）。
   - **情绪推理 (Emotional Reasoning)**：把感受当真理（如“我觉得像个白痴，所以我一定是”）。

3. **C — 后果 (Consequences)**：
   帮助用户看到这些想法如何导致了他们的情绪反应和行为。

工作策略：
- 一次只推进一个要素，不要一口气把 ABC 全讲完
- 用温和的提问引导，而不是直接告诉用户答案
- 如果用户情绪突然升级，立即暂停分析，先给予情感支持`;

const PROMPT_SOCRATIC = `你正在进行临床级认知重塑。你必须严格遵循以下原则，绝对禁止说教或直接提供结论：

1. **“科伦坡”式探寻 (Socratic Ignorance)**：
   - 保持一种温和、好奇且“稍微跟不上”的姿态（One-down position）。
   - 使用句式如：“我有点跟不上你的思路……”、“你能帮我理解一下吗？”或“你是怎么从[事件A]跳跃到[结论B]的呢？”
   - 引导用户自行解释他们逻辑中的跳跃点，而不是由你指出。

2. **实用性检验 (Utility over Truth)**：
   - 如果用户极其坚持某个负面信念（哪怕那是真的），停止寻找证据。
   - 转而询问：“坚持这个想法，对你现在的状态和解决问题，是有帮助的，还是在消耗你？”、“如果我们一直这样想，接下来的事情会变得更好还是更难？”

3. **绝不替用户得出结论**：
   - 你的任务是提供“手电筒”，照亮思维盲区，而不是直接把用户抱出黑暗。
   - 绝对禁止使用反问句（如“难道你没发现吗？”），严禁直接给出“正确”的想法。
   - 通过层层递进的开放式提问，让用户自己说出那个“打破认知扭曲的结论”。

交互策略：
- 每次只提一个极其简单的问题。
- 保持温和的困惑感，让用户成为“逻辑的解说员”。`;

const PROMPT_CRISIS = `【🚨 危机熔断协议 — 最高优先级】

当前用户可能正处于严重的心理危机中。你必须遵守以下铁律：

1. ❌ 严禁进行任何 CBT 分析、认知挑战或逻辑推演
2. ❌ 严禁追问细节或探究原因
3. ❌ 严禁评判用户的感受或行为
4. ✅ 用最温暖、最真诚的语气表达关心
5. ✅ 告诉用户他们的感受是可以被理解的
6. ✅ 引导用户拨打求助热线

求助资源（必须在回复中提供）：
- 🆘 全国青少年服务热线：12355
- 📞 全国心理援助热线：400-161-9995
- 📞 北京心理危机干预热线：010-82951332
- 📞 紧急情况请拨打：120

你唯一的目标是让用户感到被听见、被理解、被关心，并鼓励他们立刻寻求专业帮助。`;

/**
 * 获取当前 FSM 状态对应的 System Prompt 片段
 */
export function getPromptForState(state: FSMState, icebreakerLayer?: number): string {
  switch (state) {
    case 'Onboarding':
      return getOnboardingPrompt(icebreakerLayer ?? 1);
    case 'Active_Listening':
      return PROMPT_ACTIVE_LISTENING;
    case 'CBT_Stripping':
      return PROMPT_CBT_STRIPPING;
    case 'Socratic_Questioning':
      return PROMPT_SOCRATIC;
    case 'Crisis_Escalation':
      return PROMPT_CRISIS;
    default:
      return PROMPT_ACTIVE_LISTENING;
  }
}

// ============================================================
// 状态元数据（用于前端展示）
// ============================================================

export const FSM_STATE_META: Record<FSMState, {
  label: string;
  description: string;
  colorHex: string;
}> = {
  'Onboarding': {
    label: '登录破冰',
    description: '了解你的基本情况',
    colorHex: '#64B5F6',    // 温暖蓝
  },
  'Active_Listening': {
    label: '积极倾听',
    description: '我在认真听你说',
    colorHex: '#81C784',    // 鼠尾草绿
  },
  'CBT_Stripping': {
    label: '事实剥离',
    description: '区分事实、想法与情绪',
    colorHex: '#FFB74D',    // 蜜桃橙
  },
  'Socratic_Questioning': {
    label: '认知重塑',
    description: '换个角度重新看待',
    colorHex: '#CE93D8',    // 薰衣草紫
  },
  'Crisis_Escalation': {
    label: '紧急支持',
    description: '专业求助资源',
    colorHex: '#E57373',    // 珊瑚红
  },
};

/**
 * 应用 FSM 转移结果到上下文，返回新上下文（不可变更新）
 */
export function applyTransition(
  ctx: FSMContext,
  result: FSMTransitionResult,
): FSMContext {
  return {
    ...ctx,
    ...result.contextUpdate,
    currentState: result.nextState,
  };
}
