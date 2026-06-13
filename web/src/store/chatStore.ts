import { create } from 'zustand';
import type { ChatMessage, CBTStage, FSMState, TechChain, UIControl } from '../types';

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
    selectedModel: 'deepseek-v4-flash',
    icebreakerLayer: 1,

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
