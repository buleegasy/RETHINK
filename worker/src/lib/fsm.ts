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
  // Onboarding → Active_Listening 条件：
  //   ≥2 轮对话（turnCount ≥ 4，因为每轮 = user + assistant = 2条）
  //   或者用户画像已收集

  const newTurnCount = phase === 'post' ? ctx.turnCount + 1 : ctx.turnCount;
  const shouldAdvance = newTurnCount >= 4 || ctx.profileCollected;

  // 如果在 pre 阶段检测到情绪信号，即使还在 Onboarding 也可以跳过
  if (phase === 'pre' && intent.type === 'emotional' && intent.confidence >= 0.7) {
    return {
      nextState: 'Active_Listening',
      trigger: '用户在破冰阶段即流露明显情绪，提前进入倾听',
      contextUpdate: {
        turnCount: newTurnCount,
        profileCollected: true,
        emotionalStreak: 1,
      },
    };
  }

  if (phase === 'post' && shouldAdvance) {
    return {
      nextState: 'Active_Listening',
      trigger: `破冰完成 (turnCount=${newTurnCount})`,
      contextUpdate: { turnCount: newTurnCount, profileCollected: true },
    };
  }

  return {
    nextState: 'Onboarding',
    trigger: '继续破冰收集画像',
    contextUpdate: { turnCount: newTurnCount },
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

const PROMPT_ONBOARDING = `你正在与用户第一次见面。你的任务是：
1. 用温暖、轻松的语气向用户打招呼，让他们感到安全
2. 自然地了解用户的基本情况（比如称呼、大致年龄段、今天来聊的原因）
3. 不要急于进行任何心理分析或 CBT 流程
4. 表现得像一个温暖的朋友在初次认识对方

记住：这是第一印象，让用户感到被欢迎、被尊重。`;

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
export function getPromptForState(state: FSMState): string {
  switch (state) {
    case 'Onboarding':
      return PROMPT_ONBOARDING;
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
