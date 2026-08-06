Object.defineProperty(globalThis, 'window', { value: { dispatchEvent: () => {}, addEventListener: () => {} } });

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';
import type { ChatMessage } from '../types';

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearChat();
  });

  it('should initialize with default state', () => {
    const state = useChatStore.getState();
    expect(state.sessionId).toBeNull();
    expect(state.messages).toEqual([]);
    expect(state.currentStage).toBe('剥离事实');
    expect(state.fsmState).toBe('Pre_Info_Collection');
    expect(state.preInfo).toBeNull();
    expect(state.userInfo).toBeNull();
    expect(state.hasCompletedOnboarding).toBe(false);
  });

  it('should set preInfo and update userInfo', () => {
    const preInfo = { userName: '小明', collectionCompleted: true, collectedAt: 123456 };
    useChatStore.getState().setPreInfo(preInfo);

    const state = useChatStore.getState();
    expect(state.preInfo).toEqual(preInfo);
    expect(state.userInfo).toEqual({ name: '小明' });
  });

  it('should clear chat and reset preInfo/userInfo and default fsmState to Pre_Info_Collection', () => {
    const store = useChatStore.getState();
    store.setFSMState('Active_Listening');
    store.setPreInfo({ userName: '小红', collectionCompleted: true });

    expect(useChatStore.getState().fsmState).toBe('Active_Listening');
    expect(useChatStore.getState().userInfo).toEqual({ name: '小红' });

    store.clearChat();

    const state = useChatStore.getState();
    expect(state.fsmState).toBe('Pre_Info_Collection');
    expect(state.preInfo).toBeNull();
    expect(state.userInfo).toBeNull();
  });

  it('should load session', () => {
    const session = {
      id: 'session-123',
      messages: [{ id: 'msg-1', role: 'user', content: 'hello' } as ChatMessage],
      current_stage: 2,
      fsm_state: 'CBT_Stripping' as const,
    };
    
    useChatStore.getState().loadSession(session);
    
    const state = useChatStore.getState();
    expect(state.sessionId).toBe('session-123');
    expect(state.messages.length).toBe(1);
    expect(state.currentStage).toBe('捕获想法');
    expect(state.fsmState).toBe('CBT_Stripping');
    expect(state.hasCompletedOnboarding).toBe(true);
  });

  it('should add message', () => {
    const msg = { role: 'user', content: 'test msg' } as ChatMessage;
    useChatStore.getState().addMessage(msg);
    
    const state = useChatStore.getState();
    expect(state.messages.length).toBe(1);
    expect(state.messages[0].content).toBe('test msg');
    expect(state.messages[0].id).toBeDefined();
  });

  it('should update last message if it is an assistant message', () => {
    const msg1 = { role: 'user', content: 'hi' } as ChatMessage;
    const msg2 = { role: 'assistant', content: 'hello' } as ChatMessage;
    
    const store = useChatStore.getState();
    store.addMessage(msg1);
    store.addMessage(msg2);
    
    store.updateLastMessage(' world');
    
    const state = useChatStore.getState();
    expect(state.messages[1].content).toBe('hello world');
  });

  it('should not update last message if it is not an assistant message', () => {
    const msg1 = { role: 'user', content: 'hi' } as ChatMessage;
    
    const store = useChatStore.getState();
    store.addMessage(msg1);
    
    store.updateLastMessage(' world');
    
    const state = useChatStore.getState();
    expect(state.messages[0].content).toBe('hi');
  });

  it('should set last message tech chain', () => {
    const msg = { role: 'assistant', content: 'hello' } as ChatMessage;
    useChatStore.getState().addMessage(msg);
    
    const techChain: import('../types').TechChain = {
      intent: 'casual',
      ragChunks: 0,
      ragSources: [],
      ragScores: [],
      model: 'test-model',
    };
    useChatStore.getState().setLastMessageTechChain(techChain);
    
    const state = useChatStore.getState();
    expect(state.messages[0].techChain).toEqual(techChain);
  });

  it('should set stage, fsm state, and other simple properties', () => {
    const store = useChatStore.getState();
    
    store.setStage('重构认知');
    expect(useChatStore.getState().currentStage).toBe('重构认知');
    
    store.setFSMState('Onboarding');
    expect(useChatStore.getState().fsmState).toBe('Onboarding');
    
    store.setIsStreaming(true);
    expect(useChatStore.getState().isStreaming).toBe(true);
    
    store.setSelectedModel('test-model');
    expect(useChatStore.getState().selectedModel).toBe('test-model');
  });
});
