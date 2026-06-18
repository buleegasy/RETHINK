import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  login: (user: User, token: string) => void;
  logout: () => void;
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

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = getStoredToken();
  const initialUser = getStoredUser();

  return {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,

    login: (user, token) => {
      localStorage.setItem('rethink_auth_token', token);
      localStorage.setItem('rethink_auth_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },
    
    logout: () => {
      localStorage.removeItem('rethink_auth_token');
      localStorage.removeItem('rethink_auth_user');
      set({ user: null, token: null, isAuthenticated: false });
      // Notify other stores or systems if needed
      window.dispatchEvent(new Event('auth:logout'));
    },
  };
});

// 监听底层的 401 事件自动登出
window.addEventListener('auth:unauthorized', () => {
  useAuthStore.getState().logout();
});
