import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { GeminiWelcome } from './GeminiWelcome';
import { useChat } from '../hooks/useChat';

export const ChatPanel: React.FC = () => {
  const { messages, isStreaming, hasCompletedOnboarding } = useChatStore();
  const setOnboardingComplete = useChatStore(state => state.setOnboardingComplete);
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleStart = () => {
    // 标记破冰开始，用隰藏消息触发后端 Onboarding 第一层
    setOnboardingComplete(true);
    sendMessage('开启疗愈对话', undefined, undefined, { isHidden: true });
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth bg-transparent relative z-10">
      <div className="max-w-3xl mx-auto space-y-8">
        {!hasCompletedOnboarding ? (
          <GeminiWelcome onStart={handleStart} />
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
