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
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 scroll-smooth bg-transparent relative z-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-1">
        {!hasCompletedOnboarding ? (
          <GeminiWelcome onStart={handleStart} />
        ) : (
          messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const next = messages[idx + 1];
            const isFirstInGroup = !prev || prev.isHidden || prev.role !== msg.role;
            const isLastInGroup = !next || next.isHidden || next.role !== msg.role;
            // Add extra top margin when a new "speaker" starts
            const needsGroupSep = isFirstInGroup && idx > 0;
            return (
              <div key={msg.id || idx} className={needsGroupSep ? 'mt-4' : ''}>
                <MessageBubble
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} className="h-28" />
      </div>
    </div>
  );
};
