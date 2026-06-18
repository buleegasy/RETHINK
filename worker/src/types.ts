export interface AuthUser {
  uid: string;
  email: string;
}

export interface HonoSchema {
  Bindings: Env;
  Variables: {
    user: AuthUser;
  };
}

export interface Env {
  DB: D1Database;
  AI: Ai;
  VECTORIZE: Vectorize;
  API_KEY: string;
  API_BASE_URL: string;
  MODEL_NAME: string;
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  TURNSTILE_SECRET_KEY: string;
  ADMIN_SECRET_TOKEN: string;
}

// ============================================================
// FSM 状态类型（核心状态机）
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

// CBT 五阶段枚举（保留向后兼容）
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

export interface MessageTechChain {
  intent?: string;
  ragRetrievalMode?: 'ai_decision' | 'forced_safety';
  riskLevel?: 'low' | 'medium' | 'high' | 'crisis';
  riskReason?: string;
  ragQueried?: boolean;
  ragQuery?: string;
  ragDecisionReason?: string;
  ragChunks?: number;
  ragSources?: string[];
  ragScores?: number[];
  ragSnippets?: string[];
  retrievedEvidence?: {
    used_framework?: string[];
    retrieved_chunks?: Array<{
      source_type?: string;
      title?: string;
      use?: string;
    }>;
  };
  reasoningDeduction?: {
    cognitive_distortion?: string;
    emotional_core?: string;
    intervention_strategy?: string;
  };
  model?: string;
  intentConfidence?: number;
  intentTriggers?: string[];
  intentEmotion?: string;
  fsmState?: FSMState;
  fsmTrigger?: string;
}

// 聊天消息
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  techChain?: MessageTechChain;
}

export interface UserProfile {
  weather: 'Storm' | 'Thunder' | 'Fog' | 'Sunny'; // 情绪基线
  safetyIsland: 'Arcade' | 'DeepSea' | 'MusicFestival'; // 应对风格/资源
  stressor: 'Academic' | 'SelfEsteem' | 'Relationship'; // 核心压力源
}

// /api/chat 请求体
export interface ChatRequest {
  sessionId?: string;
  messages: ChatMessage[];
  stream?: boolean;
  profile?: UserProfile; // 首次进入时携带
  facialEmotion?: {
    label: string;      // e.g. 'sad'
    labelZh: string;    // e.g. '悲伤'
    confidence: number; // 0-100
  };
  model?: string;
}

// ============================================================
// 情绪类型与 UI 控制
// ============================================================

export type EmotionType = 'Anxiety' | 'LowMood' | 'Anger' | 'Neutral';

export interface UIControl {
  color_theme: string;
  lighting_style: string;
  transition_speed: string;
  effect?: string;
}

// SSE 数据块
export interface SSEChunk {
  delta: string;
  stage: CBTStage;
  done: boolean;
  sessionId?: string;
  /** FSM 当前状态 */
  fsmState?: FSMState;
  /** FSM 进入下一状态的触发条件描述 */
  fsmTrigger?: string;
  /** UI 控制参数（仅在开始或发生变化时发送，或在 done=true 时完整发送） */
  uiControl?: UIControl;
}

// D1 sessions 表行
export interface SessionRow {
  id: string;
  title: string;
  messages: string; // JSON string
  current_stage: number;
  created_at: number;
  updated_at: number;
  /** FSM 当前状态名 */
  fsm_state: string;
  /** FSM 上下文 JSON */
  fsm_context: string;
}
