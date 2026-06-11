import type { Env } from '../types';

// ============================================================
// 意图类型
// ============================================================

export type IntentType = 
  | 'casual' 
  | 'emotional' 
  | 'crisis' 
  | 'ambiguous'
  | 'academic_stress'
  | 'peer_relationship'
  | 'family_pressure'
  | 'ambiguous_risk'
  | 'source_trace';

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
 */
const CRISIS_TRIGGERS: (string | RegExp)[] = [
  '不想活', '自杀', '去死', '想死', '活着没意思', '活不下去',
  '割腕', '跳楼', '跳河', '吞药', '结束生命', '了结',
  '伤害自己', '自残', '不如死了', '死了算了',
  '杀', '伤害他人', '报复',
  '消失', '解脱', '没意义', '离开这个世界', '再见这个世界', '解脱自己',
  '不想醒来', '重开', '下辈子', '人间蒸发', '世界再见', '去找外公', '去找外婆', '见阎王', '上吊', '安眠药', '烧炭',
  /不想活了?/,
  /不想在这个世界了?/,
  /(死了|走了)算了/,
];

const SOURCE_TRACE_TRIGGERS: (string | RegExp)[] = [
  '依据', '来源', '凭什么', '为什么这么建议', '参考', '证据',
];

const ACADEMIC_TRIGGERS: (string | RegExp)[] = [
  '考试', '听写', '成绩', '作业', '排名', '分数', '错题', '不及格', '考砸', '挂科', '退步', '垫底', '落榜'
];

const PEER_TRIGGERS: (string | RegExp)[] = [
  '同桌', '同学', '朋友', '笑我', '孤立', '看不起', '背后说', '不合群', '没朋友', '传谣言', '冷落',
  '欺凌', '霸凌', '排挤', '威胁', '勒索', '打我', '辱骂', '校园暴力', '偷拍视频'
];

const FAMILY_TRIGGERS: (string | RegExp)[] = [
  '爸妈', '父母', '妈妈', '爸爸', '家里', '不够努力', '骂我'
];

/**
 * 情绪倾诉触发词
 */
const EMOTIONAL_TRIGGERS: { word: string | RegExp; weight: number }[] = [
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

  { word: '肯定失败', weight: 0.7 },
  { word: '不会好', weight: 0.7 },
  { word: '完蛋了', weight: 0.7 },
  { word: '考不上', weight: 0.7 },
  { word: '没希望', weight: 0.8 },
  { word: '一辈子', weight: 0.5 },

  { word: '总是', weight: 0.6 },
  { word: '从来', weight: 0.6 },
  { word: '所有人', weight: 0.6 },
  { word: '没有人', weight: 0.6 },
  { word: '每次都', weight: 0.6 },
  { word: '永远', weight: 0.6 },
  { word: '一定', weight: 0.5 },
  { word: '肯定是', weight: 0.5 },

  { word: 'should', weight: 0.6 },
  { word: '应该', weight: 0.6 },
  { word: '必须', weight: 0.7 },
  { word: '绝不能', weight: 0.7 },
  { word: '不准', weight: 0.6 },

  { word: '我觉得我是', weight: 0.8 },
  { word: '我感到我是', weight: 0.8 },
  { word: '感觉就像是', weight: 0.7 },

  { word: '🫠', weight: 0.9 },
  { word: '💥', weight: 0.9 },
  { word: '😭', weight: 0.9 },
  { word: '😑', weight: 0.9 },
  { word: '🤡', weight: 0.9 },
  { word: '🥺', weight: 0.9 },
  { word: '🤢', weight: 0.9 },
  { word: '💤', weight: 0.9 },

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
  
  if (!text) {
    return { type: 'casual', emotion: 'Neutral', confidence: 1.0, triggers: [] };
  }

  // 1. 危机信号检测
  const crisisMatches: string[] = [];
  for (const pattern of CRISIS_TRIGGERS) {
    const matched = matchPattern(text, pattern);
    if (matched) crisisMatches.push(matched);
  }
  if (crisisMatches.length > 0) {
    return {
      type: 'crisis',
      emotion: 'Anxiety',
      confidence: 1.0,
      triggers: crisisMatches,
    };
  }

  // 2. 溯源追踪检测
  const sourceTraceMatches: string[] = [];
  for (const pattern of SOURCE_TRACE_TRIGGERS) {
    const matched = matchPattern(text, pattern);
    if (matched) sourceTraceMatches.push(matched);
  }
  if (sourceTraceMatches.length > 0) {
    return {
      type: 'source_trace',
      emotion: 'Neutral',
      confidence: 0.9,
      triggers: sourceTraceMatches,
    };
  }

  // 3. 细分压力场景检测 (Family/Peer/Academic)
  let specificIntent: IntentType | null = null;
  const specificMatches: string[] = [];
  
  for (const pattern of FAMILY_TRIGGERS) {
    const matched = matchPattern(text, pattern);
    if (matched) { specificIntent = 'family_pressure'; specificMatches.push(matched); }
  }
  if (!specificIntent) {
    for (const pattern of PEER_TRIGGERS) {
      const matched = matchPattern(text, pattern);
      if (matched) { specificIntent = 'peer_relationship'; specificMatches.push(matched); }
    }
  }
  if (!specificIntent) {
    for (const pattern of ACADEMIC_TRIGGERS) {
      const matched = matchPattern(text, pattern);
      if (matched) { specificIntent = 'academic_stress'; specificMatches.push(matched); }
    }
  }

  // 4. 情绪倾诉检测（加权评分）
  let emotionalScore = 0;
  const emotionalMatches: string[] = [];

  for (const { word, weight } of EMOTIONAL_TRIGGERS) {
    const matched = matchPattern(text, word);
    if (matched) {
      emotionalScore += weight;
      emotionalMatches.push(matched);
    }
  }

  const lengthFactor = text.length < 20 ? 1.3 : text.length < 50 ? 1.0 : 0.8;
  emotionalScore *= lengthFactor;

  const combinedMatches = [...emotionalMatches, ...specificMatches];

  if (emotionalScore >= 0.6 || specificIntent) {
    return {
      type: specificIntent || 'emotional',
      emotion: detectSubEmotion(combinedMatches),
      confidence: Math.min((emotionalScore / 2.0) || 0.8, 1.0),
      triggers: combinedMatches,
    };
  }

  // 5. 日常闲聊检测
  const isCasual = CASUAL_PATTERNS.some(pattern => pattern.test(text));
  if (isCasual && emotionalScore < 0.3) {
    return {
      type: 'casual',
      emotion: 'Neutral',
      confidence: 0.9,
      triggers: [],
    };
  }

  // 6. 兜底：模糊意图
  if (emotionalScore > 0) {
    return {
      type: 'ambiguous',
      emotion: detectSubEmotion(combinedMatches),
      confidence: 0.5,
      triggers: combinedMatches,
    };
  }

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
   - 'crisis': 明确表达想要自杀/自伤的想法、流露强烈寻死企图，或表达虽然害怕但仍想解脱。排除被动消极意念（活着没意思）或否定表达（我不想自杀）。
   - 'source_trace': 用户主动询问 AI 的回复依据、来源、证据。
   - 'academic_stress': 明确关于考试、成绩、听写、作业等学业压力。
   - 'peer_relationship': 关于同学、同桌、朋友之间的矛盾、嘲笑、孤立。
   - 'family_pressure': 关于父母、家长、家庭环境的压力和指责。
   - 'emotional': 适用于普通的负面情绪倾诉、自负/自卑或被动消极意念（如“觉得活着没意思”）。
   - 'casual': 纯粹的打招呼、闲聊、日常问答或无负面情绪的客观陈述（如“今天天气不错”）。
   - 'ambiguous': 表达含义模糊，轻微偏中性。

2. emotion (主要情绪):
   - 'Anxiety': 焦虑、担忧、害怕、紧张、恐慌。
   - 'LowMood': 低落、委屈、无价值感、自卑、悲伤。
   - 'Anger': 愤怒、暴躁、被针对、不满、嫉妒。
   - 'Neutral': 中性、无明显情绪波动。

3. confidence: 0.0 到 1.0 的判定置信度。

4. justification: 简短说明你分类的依据。

【输出 JSON 格式规范】
{
  "type": "crisis" | "source_trace" | "academic_stress" | "peer_relationship" | "family_pressure" | "emotional" | "casual" | "ambiguous",
  "emotion": "Anxiety" | "LowMood" | "Anger" | "Neutral",
  "confidence": 0.95,
  "justification": "判定理由"
}`;

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

export async function classifyIntent(userMessage: string, env?: Env): Promise<IntentResult> {
  const ruleResult = classifyIntentRules(userMessage);

  if (!env) {
    return ruleResult;
  }

  const userMessageTrim = userMessage.trim();
  const needsLLMVerify = 
    ruleResult.type === 'crisis' || 
    (ruleResult.type === 'ambiguous' && userMessageTrim.length > 0);

  if (needsLLMVerify) {
    try {
      const verifiedResult = await verifyIntentWithLLM(userMessageTrim, ruleResult, env);
      return verifiedResult;
    } catch (e) {
      console.warn('[Intent Router LLM] Verification failed, falling back to rule result:', e);
      return ruleResult;
    }
  }

  return ruleResult;
}

function detectSubEmotion(matches: string[]): EmotionType {
  const ANXIETY_WORDS = ['焦虑', '害怕', '恐慌', '担心', '紧张', '应该', '必须', '绝不能', '考试', '成绩', '挂科'];
  const LOWMOOD_WORDS = ['低落', '难受', '没用', '废物', '绝望', '没救', '活着没意思', '我觉得我是', '我感到我是', '垫底', '孤立'];
  const ANGER_WORDS = ['生气', '愤怒', '针对我', '讨厌我', '讨厌', '恶心', '烦死了', '骂我'];

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
