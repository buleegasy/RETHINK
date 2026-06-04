// ============================================================
// FSM 状态类型
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

/** FSM 状态元数据（用于前端展示） */
export const FSM_STATE_META: Record<FSMState, {
  label: string;
  description: string;
  colorHex: string;
  icon: string;
}> = {
  'Onboarding': {
    label: '登录破冰',
    description: '了解你的基本情况',
    colorHex: '#64B5F6',
    icon: '👋',
  },
  'Active_Listening': {
    label: '积极倾听',
    description: '我在认真听你说',
    colorHex: '#81C784',
    icon: '👂',
  },
  'CBT_Stripping': {
    label: '事实剥离',
    description: '区分事实、想法与情绪',
    colorHex: '#FFB74D',
    icon: '🔍',
  },
  'Socratic_Questioning': {
    label: '认知重塑',
    description: '换个角度重新看待',
    colorHex: '#CE93D8',
    icon: '💡',
  },
  'Crisis_Escalation': {
    label: '紧急支持',
    description: '专业求助资源',
    colorHex: '#E57373',
    icon: '🆘',
  },
};

// ============================================================
// CBT 五阶段（保留向后兼容）
// ============================================================

export type CBTStage =
  | '剥离事实'
  | '捕获想法'
  | '扫描漏洞'
  | '证据质询'
  | '重构认知';

export const CBT_STAGES: CBTStage[] = [
  '剥离事实',
  '捕获想法',
  '扫描漏洞',
  '证据质询',
  '重构认知',
];

// ============================================================
// 技术链元数据
// ============================================================

/** 技术链元数据 — 每条 AI 回复附带的处理信息 */
export interface TechChain {
  intent: 'casual' | 'emotional' | 'crisis' | 'ambiguous';
  ragChunks: number;       // RAG 检索命中的知识片段数
  ragSources: string[];    // 来源文档名列表
  ragScores: number[];     // 相似度分数
  model: string;           // 使用的模型
  latencyMs?: number;      // 响应耗时
  /** FSM 当前状态 */
  fsmState?: FSMState;
  /** FSM 触发条件 */
  fsmTrigger?: string;
}

// ============================================================
// 消息类型
// ============================================================

export interface UserProfile {
  weather: 'Storm' | 'Thunder' | 'Fog' | 'Sunny';
  safetyIsland: 'Arcade' | 'DeepSea' | 'MusicFestival';
  stressor: 'Academic' | 'SelfEsteem' | 'Relationship';
}

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  techChain?: TechChain;   // 仅 assistant 消息附带
}

export interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
  sessionId?: string;
  profile?: UserProfile;
  model?: string;
}

export interface UIControl {
  color_theme: string;
  lighting_style: string;
  transition_speed: string;
  effect?: string;
}

export interface SSEChunk {
  delta: string;
  stage: CBTStage;
  done: boolean;
  sessionId?: string;
  error?: string;
  // 技术链字段（仅在 done=true 的最终 chunk 中发送）
  intent?: string;
  ragChunks?: number;
  ragSources?: string[];
  ragScores?: number[];
  model?: string;
  /** FSM 当前状态 */
  fsmState?: FSMState;
  /** FSM 进入下一状态的触发条件 */
  fsmTrigger?: string;
  /** UI 控制参数 */
  uiControl?: UIControl;
  /** 破冰层级 */
  icebreakerLayer?: number;
}
