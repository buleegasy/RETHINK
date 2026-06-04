import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';

const suggestionChips = [
  { emoji: '😴', label: '最近总是失眠...' },
  { emoji: '😔', label: '我和朋友吵架了' },
  { emoji: '📚', label: '考试压力好大' },
];

export const ChatPanel: React.FC = () => {
  const { messages, isStreaming } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-transparent">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-fade-in">
            {/* Gemini Sparkle Icon */}
            <div className="gemini-sparkle-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-8 animate-bounce-in">
              <svg viewBox="0 0 28 28" fill="none" className="w-8 h-8">
                <path
                  d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z"
                  fill="url(#gemini-grad)"
                />
                <defs>
                  <linearGradient id="gemini-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#4285F4" />
                    <stop offset="0.5" stopColor="#A142F4" />
                    <stop offset="1" stopColor="#4285F4" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-display font-medium text-on-surface mb-3 tracking-tight">
              你好，我是 <span className="gemini-gradient-text">RE-THINK</span>
            </h2>

            {/* Subtitle */}
            <p className="text-on-surface-variant max-w-md leading-relaxed text-[15px] mb-10">
              你的 AI 心理支持伙伴，随时准备倾听你的心声
            </p>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {suggestionChips.map((chip) => (
                <button
                  key={chip.label}
                  className="suggestion-chip flex items-center gap-2 text-sm"
                >
                  <span className="text-base">{chip.emoji}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
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
