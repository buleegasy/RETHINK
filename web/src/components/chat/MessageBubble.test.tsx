import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
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

  it('does not render message when isHidden is true', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hidden message',
      isHidden: true,
    };

    const { container } = render(<MessageBubble message={message} />);
    expect(container.firstChild).toBeNull();
  });

  describe('Message Deletion Flow', () => {
    it('displays the confirmation modal when delete button is clicked', async () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Delete me',
      };

      useChatStore.setState({
        messages: [message],
      });

      render(<MessageBubble message={message} />);

      // Hover-triggered delete button with aria-label="删除消息"
      const deleteBtn = screen.getByLabelText('删除消息');
      expect(deleteBtn).toBeInTheDocument();
      
      // Confirmation modal should not be visible initially
      expect(screen.queryByText('确认删除消息？')).not.toBeInTheDocument();

      // Click to open modal
      fireEvent.click(deleteBtn);

      // Assert modal elements are displayed
      expect(screen.getByText('确认删除消息？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument();
    });

    it('shows the loading spinner and disables buttons while deleting', async () => {
      const message: ChatMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'I am AI, delete me.',
      };

      useChatStore.setState({
        messages: [message],
      });

      // Create a pending promise to simulate loading
      let resolveDeletePromise: (value: void | PromiseLike<void>) => void = () => {};
      const deletePromise = new Promise<void>((resolve) => {
        resolveDeletePromise = resolve;
      });
      vi.mocked(chatApi.deleteMessage).mockReturnValueOnce(deletePromise);

      render(<MessageBubble message={message} />);

      // Click delete icon
      const deleteBtn = screen.getByLabelText('删除消息');
      fireEvent.click(deleteBtn);

      // Click confirm deletion button
      const confirmBtn = screen.getByRole('button', { name: '删除' });
      fireEvent.click(confirmBtn);

      // Verify loading state
      expect(screen.getByText('删除中...')).toBeInTheDocument();
      expect(confirmBtn).toBeDisabled();
      
      const cancelBtn = screen.getByRole('button', { name: '取消' });
      expect(cancelBtn).toBeDisabled();

      // Resolve the promise to finish
      resolveDeletePromise();
      
      await waitFor(() => {
        expect(screen.queryByText('删除中...')).not.toBeInTheDocument();
      });
    });

    it('unmounts the message from DOM when delete API call succeeds', async () => {
      const message: ChatMessage = {
        id: 'msg-3',
        role: 'user',
        content: 'Target for unmounting',
      };

      useChatStore.setState({
        messages: [message],
      });

      vi.mocked(chatApi.deleteMessage).mockResolvedValueOnce(undefined);

      // Render inside a wrapper to simulate Zustand driving list mounting/unmounting
      const TestWrapper = () => {
        const messages = useChatStore((state) => state.messages);
        return (
          <div>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        );
      };

      render(<TestWrapper />);

      // Verify initial mount
      expect(screen.getByText('Target for unmounting')).toBeInTheDocument();

      // Trigger deletion
      const deleteBtn = screen.getByLabelText('删除消息');
      fireEvent.click(deleteBtn);

      const confirmBtn = screen.getByRole('button', { name: '删除' });
      fireEvent.click(confirmBtn);

      // Verify API was called
      expect(chatApi.deleteMessage).toHaveBeenCalledWith('session-123', 'msg-3');

      // Verify DOM unmounting after state update
      await waitFor(() => {
        expect(screen.queryByText('Target for unmounting')).not.toBeInTheDocument();
      });
    });
  });
});
