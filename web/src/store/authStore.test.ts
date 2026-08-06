import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { User } from '../types';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('should login user and token', () => {
    const user: User = { uid: 'test-uid-1', username: 'testuser', email: 'test@example.com' };
    const token = 'fake-token-123';
    
    useAuthStore.getState().login(user, token);
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toEqual(token);
    expect(state.isAuthenticated).toBe(true);
    
    expect(localStorage.getItem('rethink_auth_token')).toBe(token);
    expect(JSON.parse(localStorage.getItem('rethink_auth_user') || '{}')).toEqual(user);
  });

  it('should logout and clear state', () => {
    const user: User = { uid: 'test-uid-1', username: 'testuser', email: 'test@example.com' };
    const token = 'fake-token-123';
    
    useAuthStore.getState().login(user, token);
    useAuthStore.getState().logout();
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    
    expect(localStorage.getItem('rethink_auth_token')).toBeNull();
    expect(localStorage.getItem('rethink_auth_user')).toBeNull();
  });
});
