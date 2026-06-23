import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../../types';

describe('MessageBubble Component', () => {
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
});
