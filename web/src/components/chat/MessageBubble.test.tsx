import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
import { ChatPanel } from './ChatPanel';
import type { ChatMessage } from '../../types';
import { useChatStore } from '../../store/chatStore';
import { chatApi } from '../../api/chat';

// Mock chatApi
vi.mock('../../api/chat', () => ({
  chatApi: {
    deleteMessage: vi.fn(),
  },
}));

describe('MessageBubble Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      sessionId: 'session-123',
      messages: [],
    });
  });

  it('renders user message correctly', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello, this is a test message from user.',
    };

    render(<MessageBubble message={message} />);

    // Assert that the user message content is rendered
    expect(screen.getByText('Hello, this is a test message from user.')).toBeInTheDocument();
  });

  it('renders assistant message correctly with markdown support', () => {
    const message: ChatMessage = {
      role: 'assistant',
      content: 'This is a **bold** markdown response.',
    };

    render(<MessageBubble message={message} />);

    // ReactMarkdown parses **bold** into a <strong> element
    const boldElement = screen.getByText('bold');
    expect(boldElement).toBeInTheDocument();
    expect(boldElement.tagName).toBe('STRONG');
    expect(screen.getByText(/This is a/)).toBeInTheDocument();
  });

  it('applies streaming-glow-bubble class to assistant message only when streaming', () => {
    const message: ChatMessage = {
      role: 'assistant',
      content: 'This is a message from assistant.',
    };

    const { rerender } = render(
      <MessageBubble message={message} isStreaming={true} />
    );

    // Get the message bubble container
    const chunkDiv = screen.getByText('This is a message from assistant.').closest('div')?.parentElement;
    expect(chunkDiv).toHaveClass('streaming-glow-bubble');
    expect(chunkDiv).toHaveClass('bg-surface-container/90');
    expect(chunkDiv).toHaveClass('backdrop-blur-sm');
    expect(chunkDiv).toHaveClass('transition-all');
    expect(chunkDiv).toHaveClass('duration-300');

    // Rerender with isStreaming=false
    rerender(<MessageBubble message={message} isStreaming={false} />);
    expect(chunkDiv).not.toHaveClass('streaming-glow-bubble');
    expect(chunkDiv).toHaveClass('bg-surface-container');
    expect(chunkDiv).not.toHaveClass('bg-surface-container/90');
  });

  it('does not render message when isHidden is true', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hidden message',
      isHidden: true,
    };

    const { container } = render(<MessageBubble message={message} />);
    expect(container.firstChild).toBeNull();
  });


});
