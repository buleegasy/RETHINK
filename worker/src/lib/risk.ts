import type { FSMState } from '../types';

export type RiskLevel = 'low' | 'medium' | 'high' | 'crisis';

export interface RiskAssessmentInput {
  intent: string;
  intentConfidence?: number;
  fsmState: FSMState;
  ragRetrievalMode?: 'ai_decision' | 'forced_safety';
  ragQueried?: boolean;
  triggers?: string[];
  userMessage?: string;
}

export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
}

const CRISIS_TERMS = [
  '不想活', '想死', '自杀', '自伤', '自残', '割腕', '吞药', '跳楼',
  '伤害自己', '活不下去', '结束生命',
];

const HIGH_RISK_TERMS = [
  '欺凌', '霸凌', '威胁', '勒索', '校园暴力', '打我', '辱骂', '孤立',
  '排挤', '传谣', '偷拍视频', '家暴', '失控', '撑不住',
];

export function assessRisk(input: RiskAssessmentInput): RiskAssessment {
  const text = `${input.userMessage || ''} ${input.triggers?.join(' ') || ''}`.trim();

  if (input.intent === 'crisis' || input.fsmState === 'Crisis_Escalation' || includesAny(text, CRISIS_TERMS)) {
    return {
      level: 'crisis',
      reason: '检测到明确自伤/自杀或吸收态危机信号。',
    };
  }

  if (input.ragRetrievalMode === 'forced_safety' || includesAny(text, HIGH_RISK_TERMS)) {
    return {
      level: 'high',
      reason: '检测到安全敏感或校园冲突线索，已进入强制安全检索。',
    };
  }

  if (input.intent === 'peer_relationship' || input.intent === 'family_pressure') {
    return {
      level: 'medium',
      reason: '涉及人际或家庭压力，需要持续关注但未触发危机。',
    };
  }

  if (input.intent === 'academic_stress' || input.intent === 'emotional') {
    return {
      level: 'medium',
      reason: '存在明显情绪或学业压力，但未出现高风险线索。',
    };
  }

  if (input.intent === 'source_trace') {
    return {
      level: 'low',
      reason: '用户在追问来源，属于澄清性质提问。',
    };
  }

  if (input.intent === 'casual') {
    return {
      level: 'low',
      reason: '当前轮为轻量闲聊或问候。',
    };
  }

  if ((input.intentConfidence ?? 0) < 45) {
    return {
      level: 'medium',
      reason: '意图不够清晰，保守提升风险等级以便后续观察。',
    };
  }

  return {
    level: 'low',
    reason: '未检测到明显风险信号。',
  };
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}
