import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { GeminiWelcome } from './GeminiWelcome';
import { EmojiSelector } from './EmojiSelector';
import { useChat } from '../../hooks/useChat';

export const ChatPanel: React.FC = () => {
  const { messages, isStreaming, hasCompletedOnboarding } = useChatStore();
  const setOnboardingComplete = useChatStore(state => state.setOnboardingComplete);
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleStart = () => {
    // 切换到表情包选择大屏
    setShowEmojiSelector(true);
  };

  const handleSelectEmoji = (emojiText: string) => {
    // 标记破冰开始，将表情包作为首条输入发送给 AI 并激活聊天界面
    setOnboardingComplete(true);
    sendMessage(emojiText);
  };

  const handleSkipEmoji = () => {
    // 直接解锁输入框，不发送预设表情包，由用户自由输入第一句
    setOnboardingComplete(true);
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 scroll-smooth bg-transparent relative z-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-1">
        {!hasCompletedOnboarding ? (
          !showEmojiSelector ? (
            <GeminiWelcome onStart={handleStart} />
          ) : (
            <EmojiSelector onSelect={handleSelectEmoji} onSkip={handleSkipEmoji} />
          )
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
        <div ref={bottomRef} className="h-56" />
      </div>
    </div>
  );
};
