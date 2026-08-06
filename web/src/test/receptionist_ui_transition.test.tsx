// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, renderHook, act, fireEvent } from '@testing-library/react';
import { useChatStore } from '../store/chatStore';
import { useChat } from '../hooks/useChat';
import { chatApi } from '../api/chat';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatPanel } from '../components/chat/ChatPanel';
import type { ChatMessage, PreInfoData, TechChain } from '../types';

// Mock chatApi
vi.mock('../api/chat', () => ({
  chatApi: {
    sendMessageStream: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));

describe('Receptionist UI & Pre_Info_Collection State Transition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clearChat();
  });

  describe('1. Pre_Info_Collection State Transitions & Store Updates', () => {
    it('initializes with Pre_Info_Collection state and null preInfo', () => {
      const state = useChatStore.getState();
      expect(state.fsmState).toBe('Pre_Info_Collection');
      expect(state.preInfo).toBeNull();
      expect(state.userInfo).toBeNull();
    });

    it('updates preInfo and userInfo synchronously via setPreInfo', () => {
      const preInfoData: PreInfoData = {
        userName: '李华',
        collectionCompleted: true,
        collectedAt: 1700000000000,
        fromMemory: false,
      };

      act(() => {
        useChatStore.getState().setPreInfo(preInfoData);
      });

      const state = useChatStore.getState();
      expect(state.preInfo).toEqual(preInfoData);
      expect(state.userInfo).toEqual({ name: '李华' });
    });

    it('transitions from Pre_Info_Collection to Active_Listening via SSE stream chunk', async () => {
      const encoder = new TextEncoder();
      const ssePayload = [
        'data: {"delta": "你好！我是AI接待员，请问怎么称呼您？"}\n\n',
        'data: {"delta": " 好的，李华！", "fsmState": "Active_Listening", "preInfo": {"userName": "李华", "collectionCompleted": true, "collectedAt": 1700000000000}, "done": true, "intent": "casual", "model": "claude-haiku-4.5"}\n\n'
      ].join('');

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(ssePayload));
          controller.close();
        },
      });

      vi.mocked(chatApi.sendMessageStream).mockResolvedValue(mockStream);

      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('我叫李华');
      });

      const state = useChatStore.getState();
      expect(state.fsmState).toBe('Active_Listening');
      expect(state.preInfo).toEqual({
        userName: '李华',
        collectionCompleted: true,
        collectedAt: 1700000000000,
      });
      expect(state.userInfo).toEqual({ name: '李华' });
    });

    it('resets preInfo, userInfo and fsmState back to Pre_Info_Collection on clearChat', () => {
      act(() => {
        useChatStore.getState().setFSMState('CBT_Stripping');
        useChatStore.getState().setPreInfo({ userName: '王五', collectionCompleted: true });
      });

      expect(useChatStore.getState().fsmState).toBe('CBT_Stripping');
      expect(useChatStore.getState().preInfo?.userName).toBe('王五');

      act(() => {
        useChatStore.getState().clearChat();
      });

      const state = useChatStore.getState();
      expect(state.fsmState).toBe('Pre_Info_Collection');
      expect(state.preInfo).toBeNull();
      expect(state.userInfo).toBeNull();
    });

    it('loads session and preserves preInfo & userInfo', () => {
      const sessionData = {
        id: 'session-preinfo-101',
        messages: [{ id: 'm1', role: 'user', content: '你好' } as ChatMessage],
        fsm_state: 'Active_Listening' as const,
        preInfo: { userName: '小赵', collectionCompleted: true, fromMemory: true },
      };

      act(() => {
        useChatStore.getState().loadSession(sessionData);
      });

      const state = useChatStore.getState();
      expect(state.sessionId).toBe('session-preinfo-101');
      expect(state.fsmState).toBe('Active_Listening');
      expect(state.preInfo).toEqual({ userName: '小赵', collectionCompleted: true, fromMemory: true });
      expect(state.userInfo).toEqual({ name: '小赵' });
    });
  });

  describe('2. MessageBubble TechChain & Memory Badge Rendering', () => {
    it('renders userName and (来自 Memory) badge in techChain details when preInfo is present', () => {
      const techChain: TechChain = {
        intent: 'casual',
        ragChunks: 0,
        ragSources: [],
        ragScores: [],
        model: 'test-model',
        fsmState: 'Active_Listening',
        fsmTrigger: '前置信息收集完成',
        preInfo: {
          userName: '小李',
          collectionCompleted: true,
          fromMemory: true,
        },
      };

      const message: ChatMessage = {
        role: 'assistant',
        content: '你好小李，很高兴认识你！',
        techChain,
      };

      render(<MessageBubble message={message} />);

      expect(screen.getByText('你好小李，很高兴认识你！')).toBeInTheDocument();

      // Click to expand tech chain details
      const expandBtn = screen.getByText('展开系统推演');
      fireEvent.click(expandBtn);

      // Verify user name and (来自 Memory) badge are displayed in TechChain details
      expect(screen.getByText('用户称呼:')).toBeInTheDocument();
      expect(screen.getAllByText(/小李/).length).toBeGreaterThan(0);
      expect(screen.getByText(/\(来自 Memory\)/)).toBeInTheDocument();
    });
  });

  describe('3. Smooth Chat Panel Rendering & Transitions', () => {
    it('renders GeminiWelcome when onboarding is incomplete', () => {
      render(<ChatPanel />);
      expect(screen.getByText(/你好，欢迎来到这里/)).toBeInTheDocument();
    });

    it('renders message list cleanly when onboarding is completed', () => {
      act(() => {
        useChatStore.getState().setOnboardingComplete(true);
        useChatStore.getState().addMessage({
          role: 'assistant',
          content: '你好！\n\n我是AI接待员，请问怎么称呼您？',
        });
      });

      render(<ChatPanel />);
      expect(screen.getByText('我是AI接待员，请问怎么称呼您？')).toBeInTheDocument();
    });
  });
});
