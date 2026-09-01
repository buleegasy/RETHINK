import { create } from 'zustand';
import type { ChatMessage, CBTStage, FSMState, TechChain, UIControl, PreInfoData } from '../types';

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
  preInfo: PreInfoData | null;
  userInfo: { name?: string } | null;
  
  // Voice state
  isMicActive: boolean;
  duplexPhase: 'idle' | 'listening' | 'thinking' | 'speaking';
  audioLevel: number;
  voiceSessionId: string | null;

  // Actions
  setSessionId: (id: string) => void;
  loadSession: (session: {
    id: string;
    messages: ChatMessage[];
    current_stage?: number;
    fsm_state?: FSMState;
    preInfo?: PreInfoData;
  }) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (delta: string) => void;
  setLastMessageTechChain: (techChain: TechChain) => void;
  setStage: (stage: CBTStage) => void;
  setFSMState: (state: FSMState) => void;
  setPreInfo: (preInfo: PreInfoData) => void;
  setUserInfo: (userInfo: { name?: string }) => void;
  setUIControl: (uiControl: UIControl) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setSelectedModel: (model: string) => void;
  setIcebreakerLayer: (layer: number) => void;
  
  // Voice Actions
  setIsMicActive: (active: boolean) => void;
  setDuplexPhase: (phase: 'idle' | 'listening' | 'thinking' | 'speaking') => void;
  setAudioLevel: (level: number) => void;
  setVoiceSessionId: (id: string | null) => void;
  
  clearChat: () => void;
}

const CBT_STAGE_BY_INDEX: Record<number, CBTStage> = {
  1: '剥离事实',
  2: '捕获想法',
  3: '扫描漏洞',
  4: '证据质询',
  5: '重构认知',
};

export const useChatStore = create<ChatState>((set) => {
  return {
    // Chat initial state
    sessionId: null,
    messages: [],
    currentStage: '剥离事实',
    fsmState: 'Pre_Info_Collection',
    uiControl: null,
    hasCompletedOnboarding: false,
    isStreaming: false,
    selectedModel: 'claude-haiku-4.5',
    icebreakerLayer: 1,
    preInfo: null,
    userInfo: null,
    
    // Voice initial state
    isMicActive: false,
    duplexPhase: 'idle',
    audioLevel: 0,
    voiceSessionId: null,

    // Chat Actions
    setSessionId: (id) => set({ sessionId: id }),

    loadSession: (session) => set({
      sessionId: session.id,
      messages: session.messages.map((msg) => ({ ...msg, id: msg.id || crypto.randomUUID() })),
      currentStage: session.current_stage ? CBT_STAGE_BY_INDEX[session.current_stage] || '剥离事实' : '剥离事实',
      fsmState: session.fsm_state || 'Pre_Info_Collection',
      hasCompletedOnboarding: session.messages.length > 0,
      uiControl: null,
      isStreaming: false,
      icebreakerLayer: 1,
      preInfo: session.preInfo || null,
      userInfo: session.preInfo?.userName ? { name: session.preInfo.userName } : null,
      // reset voice state on load
      isMicActive: false,
      duplexPhase: 'idle',
      audioLevel: 0,
      voiceSessionId: null,
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

    setPreInfo: (preInfo) => set((state) => ({
      preInfo,
      userInfo: preInfo.userName ? { name: preInfo.userName } : state.userInfo,
    })),

    setUserInfo: (userInfo) => set({ userInfo }),
    
    setUIControl: (uiControl) => set({ uiControl }),

    setOnboardingComplete: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),

    setIsStreaming: (isStreaming) => set({ isStreaming }),
    
    setSelectedModel: (model) => set({ selectedModel: model }),

    setIcebreakerLayer: (icebreakerLayer) => set({ icebreakerLayer }),
    
    // Voice Actions
    setIsMicActive: (active) => set({ isMicActive: active }),
    setDuplexPhase: (phase) => set({ duplexPhase: phase }),
    setAudioLevel: (level) => set({ audioLevel: level }),
    setVoiceSessionId: (id) => set({ voiceSessionId: id }),

    clearChat: () => set({ 
      sessionId: null, 
      messages: [], 
      currentStage: '剥离事实',
      fsmState: 'Pre_Info_Collection',
      uiControl: null,
      hasCompletedOnboarding: false,
      isStreaming: false,
      icebreakerLayer: 1,
      preInfo: null,
      userInfo: null,
      isMicActive: false,
      duplexPhase: 'idle',
      audioLevel: 0,
      voiceSessionId: null,
    }),
  };
});

// 监听底层的 401 或 logout 事件自动清理聊天数据
window.addEventListener('auth:logout', () => {
  useChatStore.getState().clearChat();
});
