import { create } from 'zustand';
import type { ChatSessionSummary } from '../types';

interface SessionState {
  sessions: ChatSessionSummary[];
  isLoadingSessions: boolean;
  
  setSessions: (sessions: ChatSessionSummary[]) => void;
  setIsLoadingSessions: (isLoading: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  isLoadingSessions: false,
  
  setSessions: (sessions) => set({ sessions }),
  setIsLoadingSessions: (isLoadingSessions) => set({ isLoadingSessions }),
}));

// 当退出登录时清理 sessions
window.addEventListener('auth:logout', () => {
  useSessionStore.getState().setSessions([]);
});
