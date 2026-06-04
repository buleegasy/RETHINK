/**
 * 意图路由器 — 代码级实现
 * 
 * 基于 SAG 知识库 (cbt_core_rules.md) 模块三"前置步骤：意图识别与智能路由"的规则，
 * 在 Worker 代码层面实现意图分类，决定后续处理路径。
 */

// ============================================================
// 意图类型
// ============================================================

export type IntentType = 'casual' | 'emotional' | 'crisis' | 'ambiguous';
export type EmotionType = 'Anxiety' | 'Depression' | 'Anger' | 'Neutral';

export interface IntentResult {
  type: IntentType;
  emotion: EmotionType;
  confidence: number;   // 0-1 置信度
  triggers: string[];   // 匹配到的触发词
}

// ============================================================
// 触发词库（来自 SAG 知识库）
// ============================================================

/**
 * 危机信号词 — 最高优先级
 * 出现任何一个即判定为 crisis
 */
const CRISIS_TRIGGERS = [
  '不想活', '自杀', '去死', '想死', '活着没意思', '活不下去',
  '割腕', '跳楼', '跳河', '吞药', '结束生命', '了结',
  '伤害自己', '自残', '不如死了', '死了算了',
  '杀', '伤害他人', '报复',
  '消失', '解脱', '没意义', '离开这个世界', '再见这个世界', '解脱自己',
];

/**
 * 情绪倾诉触发词 — 来自 SAG 模块二和模块三
 * 
 * 包含：
 * - 情绪化形容词
 * - 自我贬低/评价
 * - 他人心理推断
 * - 未来负面预测
 * - 绝对化表达
 */
const EMOTIONAL_TRIGGERS: { word: string; weight: number }[] = [
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
  /吃了(什么|啥)/,
  /在(干嘛|做什么|干什么)/,
  /^(嗯|哦|好的|ok|okay|知道了|明白了)/i,
];

// ============================================================
// 意图分类函数
// ============================================================

/**
 * 对用户消息进行意图分类
 * 
 * 优先级：crisis > emotional > casual > ambiguous
 * 
 * @param userMessage 用户输入的文本
 * @returns IntentResult 分类结果
 */
export function classifyIntent(userMessage: string): IntentResult {
  const text = userMessage.trim();
  
  // 空消息
  if (!text) {
    return { type: 'casual', emotion: 'Neutral', confidence: 1.0, triggers: [] };
  }

  // ---- 1. 最高优先级：危机信号检测 ----
  const crisisMatches = CRISIS_TRIGGERS.filter(t => text.includes(t));
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
    if (text.includes(word)) {
      emotionalScore += weight;
      emotionalMatches.push(word);
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
  // 如果有轻微情绪信号但不足以判定为 emotional
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

/**
 * 细分情绪类型
 */
function detectSubEmotion(matches: string[]): EmotionType {
  const ANXIETY_WORDS = ['焦虑', '害怕', '恐慌', '担心', '紧张', '应该', '必须', '绝不能'];
  const DEPRESSION_WORDS = ['低落', '难受', '没用', '废物', '绝望', '没救', '活着没意思', '我觉得我是', '我感到我是'];
  const ANGER_WORDS = ['生气', '愤怒', '针对我', '讨厌我', '讨厌', '恶心', '烦死了'];

  const counts = { Anxiety: 0, Depression: 0, Anger: 0 };

  for (const word of matches) {
    if (ANXIETY_WORDS.some(w => word.includes(w))) counts.Anxiety++;
    if (DEPRESSION_WORDS.some(w => word.includes(w))) counts.Depression++;
    if (ANGER_WORDS.some(w => word.includes(w))) counts.Anger++;
  }

  const max = Math.max(counts.Anxiety, counts.Depression, counts.Anger);
  if (max === 0) return 'Neutral';
  if (counts.Anxiety === max) return 'Anxiety';
  if (counts.Depression === max) return 'Depression';
  return 'Anger';
}
