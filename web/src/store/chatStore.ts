import { create } from 'zustand';
import type { ChatMessage, CBTStage, FSMState, TechChain, UIControl } from '../types';
import type { SandplayState } from '../types/sandplay';

interface ChatState {
  // Chat state
  sessionId: string | null;
  messages: ChatMessage[];
  currentStage: CBTStage;
  fsmState: FSMState;
  uiControl: UIControl | null;
  hasCompletedOnboarding: boolean;
  isStreaming: boolean;
  selectedModel: string;
  icebreakerLayer: number;
  isSandplayOpen: boolean;
  sandplayState: SandplayState | null;
  sandplayInvitePending: boolean;
  // Actions
  setSessionId: (id: string) => void;
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
  openSandplay: () => void;
  closeSandplay: () => void;
  updateSandplayState: (state: SandplayState) => void;
  setSandplayInvitePending: (pending: boolean) => void;
  removeLastMessage: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => {
  return {
    // Chat initial state
    sessionId: null,
    messages: [],
    currentStage: '剥离事实',
    fsmState: 'Onboarding',
    uiControl: null,
    hasCompletedOnboarding: false,
    isStreaming: false,
    selectedModel: 'claude-haiku-4.5',
    icebreakerLayer: 1,
    isSandplayOpen: false,
    sandplayState: null,
    sandplayInvitePending: false,

    // Chat Actions
    setSessionId: (id) => set({ sessionId: id }),

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
      messages: [...state.messages, { ...msg, id: msg.id || crypto.randomUUID() }] 
    })),
    
    updateLastMessage: (delta) => set((state) => {
      const messages = state.messages;
      if (messages.length > 0) {
        const lastIdx = messages.length - 1;
        // 只有当前是一条 assistant 消息时，才允许 append
        if (messages[lastIdx].role === 'assistant') {
          const newMessages = [...messages];
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: newMessages[lastIdx].content + delta,
          };
          return { messages: newMessages };
        }
      }
      return {};
    }),

    removeLastMessage: () => set((state) => {
      const messages = state.messages;
      if (messages.length > 0) {
        const lastIdx = messages.length - 1;
        if (messages[lastIdx].role === 'assistant') {
          return { messages: messages.slice(0, -1) };
        }
      }
      return {};
    }),

    setLastMessageTechChain: (techChain) => set((state) => {
      const messages = state.messages;
      if (messages.length > 0) {
        const lastIdx = messages.length - 1;
        if (messages[lastIdx].role === 'assistant') {
          const newMessages = [...messages];
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            techChain,
          };
          return { messages: newMessages };
        }
      }
      return {};
    }),
    
    setStage: (stage) => set({ currentStage: stage }),

    setFSMState: (fsmState) => set({ fsmState }),
    
    setUIControl: (uiControl) => set({ uiControl }),

    setOnboardingComplete: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),

    setIsStreaming: (isStreaming) => set({ isStreaming }),
    
    setSelectedModel: (model) => set({ selectedModel: model }),

    setIcebreakerLayer: (icebreakerLayer) => set({ icebreakerLayer }),

    openSandplay: () => set({ 
      isSandplayOpen: true, 
      sandplayInvitePending: false,
      sandplayState: useChatStore.getState().sandplayState || {
        terrain: 'forest',
        miniatures: [],
        createdAt: new Date().toISOString()
      }
    }),

    closeSandplay: () => set({ isSandplayOpen: false }),

    updateSandplayState: (sandplayState) => set({ sandplayState }),

    setSandplayInvitePending: (sandplayInvitePending) => set({ sandplayInvitePending }),

    clearChat: () => set({ 
      sessionId: null, 
      messages: [], 
      currentStage: '剥离事实',
      fsmState: 'Onboarding',
      uiControl: null,
      hasCompletedOnboarding: false,
      isStreaming: false,
      icebreakerLayer: 1,
      isSandplayOpen: false,
      sandplayState: null,
      sandplayInvitePending: false,
    }),
  };
});

// 监听底层的 401 或 logout 事件自动清理聊天数据
window.addEventListener('auth:logout', () => {
  useChatStore.getState().clearChat();
});

const CBT_STAGE_BY_INDEX: Record<number, CBTStage> = {
  1: '剥离事实',
  2: '捕获想法',
  3: '扫描漏洞',
  4: '证据质询',
  5: '重构认知',
};
