import { create } from 'zustand';
import type { ChatMessage, CBTStage, ChatSessionSummary, FSMState, TechChain, UIControl, User } from '../types';

interface ChatState {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Chat state
  sessionId: string | null;
  messages: ChatMessage[];
  sessions: ChatSessionSummary[];
  isLoadingSessions: boolean;
  currentStage: CBTStage;
  fsmState: FSMState;
  /** UI 电影级控制参数 */
  uiControl: UIControl | null;
  /** 是否已完成开场画像锚定 */
  hasCompletedOnboarding: boolean;
  isStreaming: boolean;
  selectedModel: string;
  icebreakerLayer: number;
  
  // Actions
  login: (user: User, token: string) => void;
  logout: () => void;
  setSessionId: (id: string) => void;
  setSessions: (sessions: ChatSessionSummary[]) => void;
  setIsLoadingSessions: (isLoading: boolean) => void;
  loadSession: (session: {
    id: string;
    messages: ChatMessage[];
    current_stage?: number;
    fsm_state?: FSMState;
  }) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (delta: string) => void;
  setLastMessageTechChain: (techChain: TechChain) => void;
  setStage: (stage: CBTStage) => void;
  setFSMState: (state: FSMState) => void;
  setUIControl: (uiControl: UIControl) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setSelectedModel: (model: string) => void;
  setIcebreakerLayer: (layer: number) => void;
  clearChat: () => void;
}

const getStoredToken = () => localStorage.getItem('rethink_auth_token');
const getStoredUser = () => {
  const u = localStorage.getItem('rethink_auth_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
};

export const useChatStore = create<ChatState>((set) => {
  const initialToken = getStoredToken();
  const initialUser = getStoredUser();

  return {
    // Auth initial state
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,

    // Chat initial state
    sessionId: null,
    messages: [],
    sessions: [],
    isLoadingSessions: false,
    currentStage: '剥离事实',
    fsmState: 'Onboarding',
    uiControl: null,
    hasCompletedOnboarding: false,
    isStreaming: false,
    selectedModel: 'deepseek-v4-flash',
    icebreakerLayer: 1,

    // Auth Actions
    login: (user, token) => {
      localStorage.setItem('rethink_auth_token', token);
      localStorage.setItem('rethink_auth_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('rethink_auth_token');
      localStorage.removeItem('rethink_auth_user');
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        sessionId: null, 
        messages: [], 
        sessions: [],
        isLoadingSessions: false,
        hasCompletedOnboarding: false,
        uiControl: null,
        icebreakerLayer: 1,
        fsmState: 'Onboarding',
        currentStage: '剥离事实'
      });
    },

    // Chat Actions
    setSessionId: (id) => set({ sessionId: id }),

    setSessions: (sessions) => set({ sessions }),

    setIsLoadingSessions: (isLoadingSessions) => set({ isLoadingSessions }),

    loadSession: (session) => set({
      sessionId: session.id,
      messages: session.messages.map((msg) => ({ ...msg, id: msg.id || crypto.randomUUID() })),
      currentStage: session.current_stage ? CBT_STAGE_BY_INDEX[session.current_stage] || '剥离事实' : '剥离事实',
      fsmState: session.fsm_state || 'Onboarding',
      hasCompletedOnboarding: session.messages.length > 0,
      uiControl: null,
      isStreaming: false,
      icebreakerLayer: 1,
    }),
    
    addMessage: (msg) => set((state) => ({ 
      messages: [...state.messages, { ...msg, id: crypto.randomUUID() }] 
    })),
    
    updateLastMessage: (delta) => set((state) => {
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        const lastIdx = newMessages.length - 1;
        // 只有当前是一条 assistant 消息时，才允许 append
        if (newMessages[lastIdx].role === 'assistant') {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: newMessages[lastIdx].content + delta,
          };
        }
      }
      return { messages: newMessages };
    }),

    setLastMessageTechChain: (techChain) => set((state) => {
      const newMessages = [...state.messages];
      if (newMessages.length > 0) {
        const lastIdx = newMessages.length - 1;
        if (newMessages[lastIdx].role === 'assistant') {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            techChain,
          };
        }
      }
      return { messages: newMessages };
    }),
    
    setStage: (stage) => set({ currentStage: stage }),

    setFSMState: (fsmState) => set({ fsmState }),
    
    setUIControl: (uiControl) => set({ uiControl }),

    setOnboardingComplete: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),

    setIsStreaming: (isStreaming) => set({ isStreaming }),
    
    setSelectedModel: (model) => set({ selectedModel: model }),

    setIcebreakerLayer: (icebreakerLayer) => set({ icebreakerLayer }),

    clearChat: () => set({ 
      sessionId: null, 
      messages: [], 
      currentStage: '剥离事实',
      fsmState: 'Onboarding',
      uiControl: null,
      hasCompletedOnboarding: false,
      isStreaming: false,
      icebreakerLayer: 1,
    }),
  };
});

const CBT_STAGE_BY_INDEX: Record<number, CBTStage> = {
  1: '剥离事实',
  2: '捕获想法',
  3: '扫描漏洞',
  4: '证据质询',
  5: '重构认知',
};
