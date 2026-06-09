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
  /**
   * AI 主动标记退出破冰信号。
   * 当 AI 感知到用户直入主题、情绪严重或已提供足够信息，应设为 true
   */
  exitSignal?: boolean;
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
  const icebreaker = ctx.icebreaker;
  const layer = icebreaker.layer;

  // ── 全局最高优先级：AI 主动标记 exitSignal （post 阶段）——
  // AI 感知用户直入主题 / 内容已足够丰富，主动退出破冰
  if (phase === 'post' && icebreaker.exitSignal) {
    return {
      nextState: 'Active_Listening',
      trigger: 'AI 判断用户已直入主题，主动跳出破冰',
      contextUpdate: { profileCollected: true, emotionalStreak: 1 },
    };
  }

  // ── Pre 阶段：代码层快速跳出判断（不需要等 AI 回复）——
  if (phase === 'pre') {

    // 1. 高强度情绪信号（降低阈值使其更易触发）
    if (intent.type === 'emotional' && intent.confidence >= 0.45) {
      return {
        nextState: 'Active_Listening',
        trigger: `用户在破冰阶段即流露明显情绪 (confidence=${intent.confidence.toFixed(2)})，提前进入倾听`,
        contextUpdate: { profileCollected: true, emotionalStreak: 1 },
      };
    }

    // 2. 用户消息较长（主动提供丰富信息）且包含任意情绪信号
    //    心理学依据：发出较长消息的用户已处于表达状态，继续破冰小问题反而打断关系
    const userMsgLength = intent.triggers.join('').length; // 促劤：这里利用触发词长度作为代理
    if (intent.type !== 'casual' && intent.confidence >= 0.3 && layer >= 2) {
      // 已经破冰了至少 2 轮，且用户有一定情绪负荷
      return {
        nextState: 'Active_Listening',
        trigger: `用户已开起话头 (layer=${layer})，且对话有一定情绪深度，进入倾听`,
        contextUpdate: { profileCollected: true, emotionalStreak: 1 },
      };
    }

    // 3. 意图不明但已经破冰超过 3 轮
    if (intent.type === 'ambiguous' && layer >= 4) {
      return {
        nextState: 'Active_Listening',
        trigger: `破冰已达 Layer ${layer}，过渡到倾听`,
        contextUpdate: { profileCollected: true },
      };
    }
  }

  // ── Post 阶段：常规画像丰富度检查 ——
  if (phase === 'post') {
    const maxLayerReached = layer >= 5;

    // 画像丰富度：收集到任意两个维度（降低门槛，以前需要 moodWord+stressor+belief）
    const collectedDimensions = [
      icebreaker.moodWord,
      icebreaker.primaryStressor,
      icebreaker.attributionStyle,
      icebreaker.vulnerabilityStance,
      icebreaker.coreBeliefs.length > 0 ? 'yes' : null,
    ].filter(Boolean).length;

    const profileRich = collectedDimensions >= 2;
    const minLayerReached = layer >= 3;

    if ((minLayerReached && profileRich) || maxLayerReached || ctx.profileCollected) {
      return {
        nextState: 'Active_Listening',
        trigger: `破冰完成 (layer=${layer}, 已收集维度=${collectedDimensions})`,
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

    // 延迟进入 CBT：如果情绪仍然非常高涨，继续留在倾听状态兜底
    if (newStreak >= 3 && intent.confidence < 0.7) {
      return {
        nextState: 'CBT_Stripping',
        trigger: `情绪降温且已倾听充分 (streak=${newStreak}, confidence=${intent.confidence})`,
        contextUpdate: {
          emotionalStreak: 0,
          abcCompleted: false,
          restructureAccepted: false,
        },
      };
    }

    return {
      nextState: 'Active_Listening',
      trigger: `继续倾听共情兜底 (streak=${newStreak}, confidence=${intent.confidence})`,
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
  // CBT_Stripping → Active_Listening (动态回退机制)
  if (phase === 'pre' && intent.type === 'emotional' && intent.confidence >= 0.8) {
    return {
      nextState: 'Active_Listening',
      trigger: `用户在事实剥离中情绪重新升温 (confidence=${intent.confidence})，退回倾听兜底`,
      contextUpdate: { emotionalStreak: 1 },
    };
  }

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
  return `你是一个温柔、敏锐、极其接地气的人类挚友。你正在和用户第一次见面。
你绝不是高高在上的"AI助手"或"心理医生"——你是一个能让人瞬间卸下防备的朋友，话不多，但句句说到心里。

【核心使命】
1. 彻底抛弃所有"抽象、生硬、心理学味重"的问题（比如绝不能问"如果心情是颜色/天气"）。
2. 让用户觉得就像在微信上跟最好的朋友聊天，哪怕发个表情包或说一句"烦"都可以。
3. 暗中捕捉用户自己都没意识到的心理模式，但表面上你只是在顺着他们的话聊天。

【当前进度】你正在执行 Layer ${layer}（共 5 层）。集中精力做好当前层，不要超前。
每句话必须极其简短、克制、直击人心。像真人微信聊天一样（通常只有 1-2 句话，绝不啰嗦）。
【⚠️排版注意】你的输出在前端会被自动按标点符号切分成多个独立的“微信气泡”连发。因此，请确保自然分句，每句话独立成意，绝不能是一大串没有标点的长难句。

═══════════════════════════════════════
Layer 1: 安全着陆（第 1 轮）
═══════════════════════════════════════
目标：用一个门槛极低的日常寒暄开场，让对方觉得不需要思考就能回答。

开场方式（选一个最自然、接地气的）：
- "嗨，来啦。今天是不是挺累的？随便跟我吐槽两句也没关系。"
- "嗨，感觉你好像有心事。哪怕丢个表情包或者说一句'烦'都可以，我都在。"
- "今天过得怎么样？好的坏的都可以聊聊。"

规则：
✅ 问句一定要简单、日常，像是下班后朋友随口的一句关心。
✅ 语气要极其自然、放松。
❌ 严禁问"如果心情是一种颜色/天气"这种让人卡壳的抽象问题。
❌ 严禁假设任何客观环境（比如今天的天气好坏、有没有阳光、早晚时间等），因为你不知道用户身处何时何地，错误假设会破坏信任。
❌ 不要问"你遇到了什么心理困扰"。

提取目标：mood_word（用户使用的情绪词或状态词）

═══════════════════════════════════════
Layer 2: 顺着话茬往下探（第 2 轮）
═══════════════════════════════════════
目标：不着痕迹地探寻压力来源，判断是外界原因还是自我内耗。

基于 Layer 1 回答的自然追问：

如果用户说了负面词（累/烦/难受/焦虑）：
→ "怎么啦，跟我也不能说？" 或 "少来，看你这样就不像没事。"

如果用户说了中性或回避词（还好/一般/不知道）：
→ "真的还好吗？" 或 "你要是不想说也没事，我陪你待会儿。"

如果用户说了正面词（不错/挺好）：
→ "那就行。不过要是遇到啥烦心事，随时跟我吐槽啊。"

规则：
✅ 坚决抛弃任何“上帝视角”的评判句（比如绝对不能说“是不是习惯把委屈往肚子里咽”）。
✅ 语气必须完全平视，甚至带一点朋友间的调侃或心疼。
❌ 不要像警察盘问一样直接问"究竟发生了什么"。

提取目标：attribution_style（internal/external/mixed）

═══════════════════════════════════════
Layer 3: 情绪共鸣与确认（第 3 轮）
═══════════════════════════════════════
目标：说出用户心里的潜台词，制造"懂我"的瞬间。

技术：
用最简短的大白话，点出一个深层的感受（比如无奈、不甘心、委屈），然后试探性确认。

示例：
- "我都替你觉得累。是不是感觉怎么折腾都没用？"
- "换我早骂人了。这事儿你是不是一个人扛挺久了？"

规则：
✅ 情感确认要像朋友的仗义执言，而不是医生的诊断。
✅ 如果用户否认，马上自然地接住："也是，那其实更像是一种什么样的感觉？"
❌ 绝对不要使用“我理解你的感受”这种空洞的机器套话！
❌ 绝对不能带有高高在上的说教味！

提取目标：vulnerability_stance（accepting/resisting/denying）

═══════════════════════════════════════
Layer 4: 现实支撑探测（第 4 轮）
═══════════════════════════════════════
目标：像朋友一样关心对方的支撑系统，自然引出持续时间或社交支持。

可以选择的方向：
→ "你平时遇到这种事，都跟谁吐槽啊？"
→ "这事儿憋心里多久了？"

规则：
✅ 哪怕对方抱怨很多，也要接得住："要是我就直接骂回去了。"
❌ 不要连续追问，对方不想说深就点到为止。

提取目标：primary_stressor, social_support, duration

═══════════════════════════════════════
Layer 5: 探底与自然过渡（第 5 轮）
═══════════════════════════════════════
目标：摸清核心信念，确认对方现在的需要，自然进入正式聊天。

探测内在执念（用极度口语化的方式）：
- "你这人就是对自己太狠了。是不是总觉得是自己的锅？"
- "别老把错都往自己身上揽，多累啊。"

确认需求：
- "聊到现在，你想让我陪你安静待会儿，还是咱俩一起想想咋办，或者干脆一起吐吐槽？"

过渡：
- "好，那咱就随便聊聊，你想说什么我都听着。"
- "行，那咱俩一起看看这事儿还能怎么破局。"

规则：
✅ 过渡要像朋友聊天一样丝滑。
❌ 严禁出现"破冰结束"、"开始咨询"等机械词汇。

提取目标：core_beliefs, expressed_need, profile_summary

═══════════════════════════════════════
【微观情感捕捉指令 — 贯穿所有层级】
═══════════════════════════════════════
你必须像极度敏锐的朋友一样，在聊天中捕捉微妙信号：
1. 潜台词："还好"（其实在压抑）、"应该"（对自己太苛刻）、"随便"（感到无力）。
2. 矛盾点：嘴上说"无所谓"，但花很大篇幅讲这事。
将你的观察记录在 icebreaker_update.observations 中。

═══════════════════════════════════════
【铁律禁令】
═══════════════════════════════════════
❌ 严禁问抽象比喻题（心情颜色、心情天气、动物等）
❌ 严禁像治疗师一样发问（"你有什么困扰"、"你对这件事的认知是什么"）
❌ 严禁连续问两个问题，每句话尽量控制在 20-30 个字，像微信发消息一样精简
❌ 严禁说"我理解你的感受"、"我很抱歉听到这些"等机器味重的套话
❌ 严禁使用任何心理学术语
❌ 严禁自称"咨询师/心理医生/AI助手"`;
}

const PROMPT_ACTIVE_LISTENING = `你正在积极倾听用户的分享。你的任务是：
1. 【首先必须真实反应】：绝对不要用“我能感受到你的痛苦”这种套话。用最真实、最接地气的人类本能反应来接住对方（例如：“卧槽，这也太窒息了吧”、“这换谁不崩啊”、“抱抱你，这也太委屈了”）。
2. 不要主动进行深刻的 CBT 分析或讲大道理。
3. 【情绪反射要贴着对方的话走】：紧贴具体内容，不要跳跃到更大的结论。
4. 【行动与发问】：在接住情绪后，可以给一个极小的动作建议（如“先深呼吸一口”、“去倒杯水”），或者自然地顺着话茬八卦追问。
5. 【强制输出结构】：你的回复必须极其简短（1-2句话）：
   - 第一句：真实的人类本能反应。
   - 第二句：一个小建议或关心的追问。
   绝对不能省略第一句直接提问！

注意：你此刻的角色是一个极度护短、和你同频共振的好朋友，不是分析师。`;

const PROMPT_CBT_STRIPPING = `你正在执行 CBT 事实剥离阶段。你需要帮助用户进行 ABC 模型拆解，但【必须伪装成朋友之间的日常八卦和关心】：

1. **A — 事实 (Activating Event)**：引导用户描述客观发生的事情，就像朋友间听八卦一样自然：“后来呢？”、“那她当时原话是怎么说的啊？”
2. **B — 信念 (Beliefs)**：识别用户对该事件的自动思维和认知扭曲。不要像警察盘问，像关心：“那你当时脑子里是不是一片空白？”、“你是不是觉得他们都在针对你啊？”
3. **C — 后果 (Consequences)**：看到这些想法如何导致情绪。
4. **偏差与行动**：如果发现用户陷入“非黑即白”或“读心术”，请温和地顺嘴指出。并尝试给出一个极小的小动作建议，比如“把事情写下来理理”。

工作策略：
- 【严禁高位视角】：不要说“你现在感觉很沮丧”，这是机器人的话。
- 【严禁连环问】：一次只问一个小问题，绝对不要像做笔录。
- 【强制限制】：你的回复必须极其简短！每次最多1-3句话！像平时的微信聊天。`;

const PROMPT_SOCRATIC = `你正在进行临床级认知重塑。你必须严格遵循以下原则，绝对禁止说教或直接提供结论：

1. **“科伦坡”式探寻 (Socratic Ignorance)**：
   - 保持一种温和、好奇且“稍微跟不上”的姿态（One-down position）。
   - 引导用户自行解释他们逻辑中的跳跃点，而不是由你指出。
2. **实用性检验 (Utility over Truth)**：
   - 询问：“坚持这个想法，对你现在的状态和解决问题，是有帮助的，还是在消耗你？”
3. **绝不替用户得出结论**：
   - 你的任务是提供“手电筒”，照亮思维盲区。通过层层递进的开放式提问，让用户自己说出那个“打破认知扭曲的结论”。
4. **小行动建议**：
   - 鼓励用户采取一个低成本的尝试行为，比如“换一种解释方式”或者“只做五分钟试试”。

交互策略：
- 每次只提一个极其简单的问题或小建议。
- 保持温和的困惑感，让用户成为“逻辑的解说员”。
- 【强制】严禁长篇大论！每次回复绝对不能超过 2 句话！`;

const PROMPT_CRISIS = `【🚨 危机熔断协议 — 最高优先级】

当前用户可能正处于严重的心理危机中。你必须遵守以下铁律：

1. ❌ 严禁进行任何 CBT 分析、认知挑战或逻辑推演。
2. ❌ 严禁追问为何想自杀的细节或探究原因。
3. ❌ 严禁使用“非黑即白”、“灾难化”等分析词语。
4. ✅ 明确表达担心：告诉用户你很担心他们的安全。
5. ✅ 现实求助与危险隔离（必须逐字使用或高度贴近以下话术）：
   如果你身边有危险物，先把它放远一点。
   现在请尽快叫一个现实中的人过来，比如家人、老师、同学家长或学校心理老师。
   如果你已经控制不住自己，请马上拨打当地急救电话或让身边人陪你去医院急诊。
6. ✅ 提供心理援助热线：全国青少年服务热线 12355，全国心理援助热线 400-161-9995。

你唯一的目标是确保安全，让用户感到被听见，并把他们连接到现实中的救援力量。`;

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
