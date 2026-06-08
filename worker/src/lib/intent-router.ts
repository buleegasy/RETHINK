import type { Env } from '../types';

// ============================================================
// 意图类型
// ============================================================

export type IntentType = 'casual' | 'emotional' | 'crisis' | 'ambiguous';
export type EmotionType = 'Anxiety' | 'LowMood' | 'Anger' | 'Neutral';

export interface IntentResult {
  type: IntentType;
  emotion: EmotionType;
  confidence: number;   // 0-1 置信度
  triggers: string[];   // 匹配到的触发词
}

// ============================================================
// 触发词库（来自 SAG 知识库，已全面扩展）
// ============================================================

/**
 * 危机信号词 — 最高优先级
 * 出现任何一个即判定为 crisis（后经 LLM 语义校验排除否定句或误判）
 */
const CRISIS_TRIGGERS: (string | RegExp)[] = [
  '不想活', '自杀', '去死', '想死', '活着没意思', '活不下去',
  '割腕', '跳楼', '跳河', '吞药', '结束生命', '了结',
  '伤害自己', '自残', '不如死了', '死了算了',
  '杀', '伤害他人', '报复',
  '消失', '解脱', '没意义', '离开这个世界', '再见这个世界', '解脱自己',
  // 新增隐式危机与网络缩写表达
  '不想醒来', '重开', '下辈子', '人间蒸发', '世界再见', '去找外公', '去找外婆', '见阎王', '上吊', '安眠药', '烧炭',
  /不想活了?/,
  /不想在这个世界了?/,
  /(死了|走了)算了/,
];

/**
 * 情绪倾诉触发词 — 来自 SAG 模块二和模块三，已扩充青少年高频与网络词汇
 */
const EMOTIONAL_TRIGGERS: { word: string | RegExp; weight: number }[] = [
  // ---- 情绪化形容词 (权重 0.8) ----
  { word: '丢脸', weight: 0.8 },
  { word: '可怕', weight: 0.8 },
  { word: '糟糕', weight: 0.8 },
  { word: '没救', weight: 0.8 },
  { word: '恶心', weight: 0.8 },
  { word: '崩溃', weight: 0.8 },
  { word: '绝望', weight: 0.8 },
  { word: '痛苦', weight: 0.8 },
  { word: '难受', weight: 0.7 },
  { word: '焦虑', weight: 0.7 },
  { word: '害怕', weight: 0.7 },
  { word: '恐慌', weight: 0.8 },
  { word: '无助', weight: 0.8 },
  { word: '委屈', weight: 0.7 },

  // ---- 自我贬低/评价 (权重 0.9) ----
  { word: '我很差', weight: 0.9 },
  { word: '我没用', weight: 0.9 },
  { word: '我不配', weight: 0.9 },
  { word: '我是累赘', weight: 0.9 },
  { word: '我是废物', weight: 0.9 },
  { word: '我什么都做不好', weight: 0.9 },
  { word: '差生', weight: 0.8 },
  { word: '失败者', weight: 0.8 },
  { word: '我完了', weight: 0.9 },
  { word: '彻底完了', weight: 0.9 },

  // ---- 他人心理推断 (权重 0.7) ----
  { word: '讨厌我', weight: 0.7 },
  { word: '看不起我', weight: 0.7 },
  { word: '都在笑我', weight: 0.7 },
  { word: '针对我', weight: 0.7 },
  { word: '故意', weight: 0.5 },
  { word: '觉得我蠢', weight: 0.8 },
  { word: '觉得我笨', weight: 0.8 },
  { word: '不喜欢我', weight: 0.6 },
  { word: '排挤我', weight: 0.7 },
  { word: '孤立我', weight: 0.7 },

  // ---- 未来负面预测 (权重 0.7) ----
  { word: '肯定失败', weight: 0.7 },
  { word: '不会好', weight: 0.7 },
  { word: '完蛋了', weight: 0.7 },
  { word: '考不上', weight: 0.7 },
  { word: '没希望', weight: 0.8 },
  { word: '一辈子', weight: 0.5 },

  // ---- 绝对化表达 (权重 0.6) ----
  { word: '总是', weight: 0.6 },
  { word: '从来', weight: 0.6 },
  { word: '所有人', weight: 0.6 },
  { word: '没有人', weight: 0.6 },
  { word: '每次都', weight: 0.6 },
  { word: '永远', weight: 0.6 },
  { word: '一定', weight: 0.5 },
  { word: '肯定是', weight: 0.5 },

  // ---- 应该句式 (Should Statements) (权重 0.7) ----
  { word: 'should', weight: 0.6 },
  { word: '应该', weight: 0.6 },
  { word: '必须', weight: 0.7 },
  { word: '绝不能', weight: 0.7 },
  { word: '不准', weight: 0.6 },

  // ---- 情绪推理 (Emotional Reasoning) (权重 0.8) ----
  { word: '我觉得我是', weight: 0.8 },
  { word: '我感到我是', weight: 0.8 },
  { word: '感觉就像是', weight: 0.7 },

  // ---- 表情包直接输入 (权重 0.9) ----
  { word: '🫠', weight: 0.9 },
  { word: '💥', weight: 0.9 },
  { word: '😭', weight: 0.9 },
  { word: '😑', weight: 0.9 },
  { word: '🤡', weight: 0.9 },
  { word: '🥺', weight: 0.9 },
  { word: '🤢', weight: 0.9 },
  { word: '💤', weight: 0.9 },

  // ==========================================
  // 新增：学业压力词汇 (权重 0.7 - 0.8)
  // ==========================================
  { word: '不及格', weight: 0.8 },
  { word: '考砸', weight: 0.8 },
  { word: '挂科', weight: 0.8 },
  { word: '退步', weight: 0.7 },
  { word: '名次', weight: 0.6 },
  { word: '垫底', weight: 0.8 },
  { word: '落榜', weight: 0.8 },
  { word: '写不完', weight: 0.6 },
  { word: '作业多', weight: 0.6 },
  { word: '前途', weight: 0.7 },
  { word: '高考', weight: 0.7 },
  { word: '中考', weight: 0.7 },
  { word: '学不进去', weight: 0.8 },
  { word: '听不懂', weight: 0.7 },

  // ==========================================
  // 新增：人际交往/家庭冲突 (权重 0.7 - 0.8)
  // ==========================================
  { word: '冷暴力', weight: 0.8 },
  { word: '不合群', weight: 0.7 },
  { word: '没朋友', weight: 0.8 },
  { word: '传谣言', weight: 0.8 },
  { word: '说闲话', weight: 0.7 },
  { word: '冷落', weight: 0.7 },
  { word: '不理我', weight: 0.7 },
  { word: '不带我玩', weight: 0.7 },
  { word: '欺负', weight: 0.8 },
  { word: '掌控欲', weight: 0.8 },
  { word: '道德绑架', weight: 0.8 },
  { word: '被当成透明人', weight: 0.8 },
  { word: '多余的', weight: 0.8 },

  // ==========================================
  // 新增：青少年网络流行语/Emo词 (权重 0.7 - 0.9)
  // ==========================================
  { word: '摆烂', weight: 0.8 },
  { word: '内卷', weight: 0.7 },
  { word: 'emo', weight: 0.8 },
  { word: '破防', weight: 0.8 },
  { word: '无语', weight: 0.6 },
  { word: '心累', weight: 0.7 },
  { word: '躺平', weight: 0.7 },
  { word: '寄了', weight: 0.8 },
  { word: '凉了', weight: 0.7 },
  { word: '大冤种', weight: 0.7 },
  { word: '精神内耗', weight: 0.8 },
  { word: 'cpu我', weight: 0.8 },
  { word: '画饼', weight: 0.7 },
  { word: '负罪感', weight: 0.8 },
  { word: '烂泥扶不上墙', weight: 0.9 },
  { word: '烂摊子', weight: 0.7 },
  { word: '透明人', weight: 0.8 },
  
  // ==========================================
  // 正则模式匹配 (权重 0.8)
  // ==========================================
  { word: /(焦虑|烦躁|难受|恶心)死了/, weight: 0.8 },
  { word: /对.*失望/, weight: 0.8 },
  { word: /(不想|讨厌)去学校/, weight: 0.8 },
  { word: /没意思/, weight: 0.7 },
  { word: /睡过去.*(不|别)醒/, weight: 0.9 },
];

/**
 * 日常闲聊/中性表达模式
 */
const CASUAL_PATTERNS = [
  /^(你好|嗨|hi|hello|hey)/i,
  /^(早上好|晚上好|下午好|早安|晚安)/,
  /^(谢谢|感谢|多谢|thanks)/i,
  /^(再见|拜拜|bye)/i,
  /今天天气/,
  /吃了(稳吃|什么|啥)/,
  /在(干嘛|做什么|干什么)/,
  /^(嗯|哦|好的|ok|okay|知道了|明白了)/i,
];

// ============================================================
// 辅助匹配函数
// ============================================================

function matchPattern(text: string, pattern: string | RegExp): string | null {
  if (typeof pattern === 'string') {
    return text.includes(pattern) ? pattern : null;
  } else {
    const match = text.match(pattern);
    return match ? match[0] : null;
  }
}

// ============================================================
// 意图分类函数 — 规则引擎快速通道 (同步)
// ============================================================

export function classifyIntentRules(userMessage: string): IntentResult {
  const text = userMessage.trim();
  
  // 空消息
  if (!text) {
    return { type: 'casual', emotion: 'Neutral', confidence: 1.0, triggers: [] };
  }

  // ---- 1. 最高优先级：危机信号检测 ----
  const crisisMatches: string[] = [];
  for (const pattern of CRISIS_TRIGGERS) {
    const matched = matchPattern(text, pattern);
    if (matched) {
      crisisMatches.push(matched);
    }
  }

  if (crisisMatches.length > 0) {
    return {
      type: 'crisis',
      emotion: 'Anxiety',
      confidence: 1.0,
      triggers: crisisMatches,
    };
  }

  // ---- 2. 情绪倾诉检测（加权评分） ----
  let emotionalScore = 0;
  const emotionalMatches: string[] = [];

  for (const { word, weight } of EMOTIONAL_TRIGGERS) {
    const matched = matchPattern(text, word);
    if (matched) {
      emotionalScore += weight;
      emotionalMatches.push(matched);
    }
  }

  // 文本长度归一化：短文本中出现情绪词权重更高
  const lengthFactor = text.length < 20 ? 1.3 : text.length < 50 ? 1.0 : 0.8;
  emotionalScore *= lengthFactor;

  // 阈值判定
  if (emotionalScore >= 0.6) {
    return {
      type: 'emotional',
      emotion: detectSubEmotion(emotionalMatches),
      confidence: Math.min(emotionalScore / 2.0, 1.0),
      triggers: emotionalMatches,
    };
  }

  // ---- 3. 日常闲聊检测 ----
  const isCasual = CASUAL_PATTERNS.some(pattern => pattern.test(text));
  if (isCasual && emotionalScore < 0.3) {
    return {
      type: 'casual',
      emotion: 'Neutral',
      confidence: 0.9,
      triggers: [],
    };
  }

  // ---- 4. 兜底：模糊意图 ----
  if (emotionalScore > 0) {
    return {
      type: 'ambiguous',
      emotion: detectSubEmotion(emotionalMatches),
      confidence: 0.5,
      triggers: emotionalMatches,
    };
  }

  // 完全无情绪信号的中性输入
  return {
    type: 'ambiguous',
    emotion: 'Neutral',
    confidence: 0.6,
    triggers: [],
  };
}

// ============================================================
// 意图分类函数 — 语义/LLM 校验通道 (异步)
// ============================================================

/**
 * 使用 LLM 进行意图和情绪双重校验，处理否定句和隐性语义
 */
async function verifyIntentWithLLM(
  text: string,
  initial: IntentResult,
  env: Env
): Promise<IntentResult> {
  const model = env.MODEL_NAME || 'anthropic/claude-sonnet-4.6';
  const apiBaseUrl = env.API_BASE_URL || 'https://openrouter.ai/api/v1';
  const apiKey = env.API_KEY;

  if (!apiKey) {
    throw new Error('API_KEY is not configured in environment');
  }

  const systemPrompt = `你是一个专业的心理倾诉意图与情绪分类器。分析用户的话语，并严格输出 JSON 格式。

【分类规则】
1. type (意图类型):
   - 'crisis': 适用于【主动性自杀/自残/伤害他人意念】（Active Suicidal/Self-harm Ideation）或已在进行中的危机行为。
     * 特征包含：明确表达想要自杀/自伤的想法、提及具体方式或工具（如跳楼、吞药、割腕）、流露强烈且即时的寻死企图，或表达虽然害怕但仍有强烈的寻死想法（如“我很怕跳楼，但我真的想解脱”）。
     * ⚠️ 必须排除以下情况（判为 'emotional' 或 'ambiguous'）：
       a) 被动消极意念（Passive Ideation）：若用户仅表达“生存意愿丧失/觉得活着没意思/希望自己消失/睡过去别醒来”等被动想法，因无需进入物理危机救援，不能判为 'crisis'，而应判定为 'emotional'（由普通引导程序进行共情疏导）。
       b) 否定表达：明确表达没有自杀/自伤想法或行为（如“我不想自杀”、“我并没有想自残，别担心”）。
       c) 过去经历/他人经历/探讨作品：提及他人经历（如“我同学想吃药轻生”）、过去的历史（如“我去年想过跳楼”）或讨论文艺作品/新闻（如“电影里有自杀情节”）。
   - 'emotional': 适用于任何普通的负面情绪倾诉、学业/同伴/家庭压力、自负/自卑，或上述被动消极意念（如“觉得活着没意思”）。
   - 'casual': 纯粹的打招呼、闲聊、日常问答或无负面情绪的客观陈述（如“你好”、“你吃了吗”、“今天天气不错”）。
   - 'ambiguous': 表达含义模糊，无法立刻判定是否有心理情绪困扰，或轻微偏中性的日常分享。

2. emotion (主要情绪):
   - 'Anxiety': 焦虑、担忧、害怕、紧张、恐慌。
   - 'LowMood': 低落、委屈、无价值感、自卑、悲伤。
   - 'Anger': 愤怒、暴躁、被针对、不满、嫉妒。
   - 'Neutral': 中性、无明显情绪波动。

3. confidence: 0.0 到 1.0 的判定置信度。

4. justification: 简短说明你分类的依据，特别是你如何识别否定句、转折关系、被动消极意念或主动倾向。

【输出 JSON 格式规范】
{
  "type": "crisis" | "emotional" | "casual" | "ambiguous",
  "emotion": "Anxiety" | "LowMood" | "Anger" | "Neutral",
  "confidence": 0.95,
  "justification": "判定理由"
}

注意：只输出合法的 JSON 对象本身，不要输出任何额外的 Markdown 标记（如 \`\`\`json）或文字！`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ];

  const res = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://re-think-agent.pages.dev',
      'X-Title': 'RE-THINK Agent',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    throw new Error(`LLM classification request failed: ${res.statusText}`);
  }

  const data = await res.json() as any;
  const content = (data.choices[0]?.message?.content || '{}').trim();
  const parsed = JSON.parse(content);

  return {
    type: parsed.type || initial.type,
    emotion: parsed.emotion || initial.emotion,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : initial.confidence,
    triggers: initial.triggers
  };
}

/**
 * 主入口：对用户消息进行意图分类 (异步，支持规则 + LLM 校验)
 * 
 * 优先级：crisis > emotional > casual > ambiguous
 */
export async function classifyIntent(userMessage: string, env?: Env): Promise<IntentResult> {
  const ruleResult = classifyIntentRules(userMessage);

  // 如果没有传入 env 绑定，无法调用大模型，直接返回规则结果
  if (!env) {
    return ruleResult;
  }

  // 以下情况触发 LLM 语义校验：
  // 1. 规则命中了危机词 (type === 'crisis') — 需要通过 LLM 过滤否定句/误判，防范误报。
  // 2. 规则未判定明确意图 (type === 'ambiguous') 且用户有输入 — 需要通过 LLM 识别隐式倾诉，防范漏报。
  const userMessageTrim = userMessage.trim();
  const needsLLMVerify = 
    ruleResult.type === 'crisis' || 
    (ruleResult.type === 'ambiguous' && userMessageTrim.length > 0);

  if (needsLLMVerify) {
    try {
      const verifiedResult = await verifyIntentWithLLM(userMessageTrim, ruleResult, env);
      console.log(`[Intent Router LLM] Verified result: type=${verifiedResult.type}, emotion=${verifiedResult.emotion}, confidence=${verifiedResult.confidence.toFixed(2)}`);
      return verifiedResult;
    } catch (e) {
      console.warn('[Intent Router LLM] Verification failed, falling back to rule result:', e);
      return ruleResult;
    }
  }

  return ruleResult;
}

// ============================================================
// 细分情绪类型
// ============================================================

function detectSubEmotion(matches: string[]): EmotionType {
  const ANXIETY_WORDS = ['焦虑', '害怕', '恐慌', '担心', '紧张', '应该', '必须', '绝不能'];
  const LOWMOOD_WORDS = ['低落', '难受', '没用', '废物', '绝望', '没救', '活着没意思', '我觉得我是', '我感到我是'];
  const ANGER_WORDS = ['生气', '愤怒', '针对我', '讨厌我', '讨厌', '恶心', '烦死了'];

  const counts = { Anxiety: 0, LowMood: 0, Anger: 0 };

  for (const word of matches) {
    if (ANXIETY_WORDS.some(w => word.includes(w))) counts.Anxiety++;
    if (LOWMOOD_WORDS.some(w => word.includes(w))) counts.LowMood++;
    if (ANGER_WORDS.some(w => word.includes(w))) counts.Anger++;
  }

  const max = Math.max(counts.Anxiety, counts.LowMood, counts.Anger);
  if (max === 0) return 'Neutral';
  if (counts.Anxiety === max) return 'Anxiety';
  if (counts.LowMood === max) return 'LowMood';
  return 'Anger';
}
