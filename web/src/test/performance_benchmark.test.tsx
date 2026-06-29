import type { ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, screen, waitFor } from '@testing-library/react';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useChatStore } from '../store/chatStore';

// We want to count actual rendering of MessageBubble.
let messageBubbleRenderCount = 0;

vi.mock('../components/chat/MessageBubble', async (importOriginal) => {
  const React = await import('react');
  const actual = await importOriginal<typeof import('../components/chat/MessageBubble')>();
  const MockedMessageBubble = React.memo((props: ComponentProps<typeof actual.MessageBubble>) => {
    messageBubbleRenderCount++;
    return <actual.MessageBubble {...props} />;
  });
  return {
    ...actual,
    MessageBubble: MockedMessageBubble,
  };
});

vi.mock('../api/chat', () => ({
  chatApi: {
    deleteMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    sendMessage: vi.fn(),
    error: null,
  }),
}));

describe('ChatPanel Performance & Stress Benchmark Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageBubbleRenderCount = 0;
    useChatStore.setState({
      sessionId: 'test-session-perf',
      messages: [],
      hasCompletedOnboarding: true,
      isStreaming: false,
    });
  });

  it('runs performance benchmark and verifies O(1) streaming updates without memory leaks', async () => {
    const startTime = performance.now();

    // Render ChatPanel
    const { container } = render(<ChatPanel />);

    const numTurns = 50;
    const chunksPerReply = 5;

    // Simulate 50 user messages and 50 assistant replies (100 total messages)
    for (let i = 0; i < numTurns; i++) {
      // 1. User Message
      act(() => {
        useChatStore.getState().addMessage({
          id: `user-msg-${i}`,
          role: 'user',
          content: `This is user message number ${i}. Let's discuss mental health.`,
        });
      });

      // 2. Assistant Message (Empty Initial)
      const assistantMsgId = `assistant-msg-${i}`;
      act(() => {
        useChatStore.getState().addMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: '',
        });
        useChatStore.getState().setIsStreaming(true);
      });

      // 3. Streaming delta tokens
      for (let j = 0; j < chunksPerReply; j++) {
        act(() => {
          useChatStore.getState().updateLastMessage(` Chunk ${j} of AI response ${i}.`);
        });
      }

      // 4. End Streaming
      act(() => {
        useChatStore.getState().setIsStreaming(false);
      });
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`[Performance Benchmark] Duration: ${duration.toFixed(2)}ms`);
    console.log(`[Performance Benchmark] MessageBubble render count: ${messageBubbleRenderCount}`);

    // Verify all 100 messages are in the store
    const storeMessages = useChatStore.getState().messages;
    expect(storeMessages.length).toBe(100);

    // Verify all 100 messages are rendered in the DOM
    const userMsgElements = screen.queryAllByText(/This is user message number/);
    expect(userMsgElements.length).toBe(numTurns);

    // Verify that the assistant messages are rendered fully
    const assistantMsgElements = screen.queryAllByText(/Chunk 4 of AI response/);
    expect(assistantMsgElements.length).toBe(numTurns);

    // Verify O(1) rendering efficiency:
    // With O(1) chunk rendering complexity, total renders scales linearly:
    // User message: 1 render
    // Assistant start: 1 render
    // 5 chunks: 5 renders
    // Assistant end streaming: 1 render (isStreaming changes from true to false)
    // Plus, the previous assistant message updates its isLastInGroup: 1 render when a new user message starts.
    // So around 9 renders per turn, times 50 turns = ~450 renders.
    // If it were O(N) complexity (re-rendering all past messages on every state update),
    // it would render about N^2 / 2 * chunks = ~50^2 * 8 = ~20,000+ times.
    // Asserting that the render count is less than 600 confirms O(1) incremental rendering.
    expect(messageBubbleRenderCount).toBeLessThan(600);

    // Memory / DOM Leak Checks
    // 1. Verify that no duplicate delete modals are leaked/bloating the DOM
    // The delete modal is rendered conditionally at parent level only. When not deleting, modal count should be 0.
    const modalTitle = screen.queryByText('确认删除消息？');
    expect(modalTitle).not.toBeInTheDocument();

    // 2. Count total DOM nodes to verify scale stability
    const totalDOMNodes = container.querySelectorAll('*').length;
    console.log(`[Performance Benchmark] Total DOM elements: ${totalDOMNodes}`);
    
    // Each message bubble should have a bounded number of elements (around 10-25 elements).
    // For 100 messages, total DOM nodes should scale cleanly and not blow up exponentially.
    expect(totalDOMNodes).toBeLessThan(2500);
  });
});
