import { create } from 'zustand';
import type { ChatMessage, CBTStage, FSMState, TechChain, UIControl } from '../types';

interface ChatState {
  sessionId: string | null;
  messages: ChatMessage[];
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
  setSessionId: (id: string) => void;
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

export const useChatStore = create<ChatState>((set) => ({
  sessionId: null,
  messages: [],
  currentStage: '剥离事实',
  fsmState: 'Onboarding',
  uiControl: null,
  hasCompletedOnboarding: false,
  isStreaming: false,
  selectedModel: 'deepseek-v4-flash',
  icebreakerLayer: 1,

  setSessionId: (id) => set({ sessionId: id }),
  
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
}));
