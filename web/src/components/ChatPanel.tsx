import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { GeminiWelcome } from './GeminiWelcome';

export const ChatPanel: React.FC = () => {
  const { messages, isStreaming } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-transparent relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {messages.length === 0 ? (
          <GeminiWelcome />
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id || idx}
              message={msg}
              isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
            />
          ))
        )}
        <div ref={bottomRef} className="h-32" />
      </div>
    </div>
  );
};
