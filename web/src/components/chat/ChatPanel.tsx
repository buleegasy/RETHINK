import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { GeminiWelcome } from './GeminiWelcome';
import { EmojiSelector } from './EmojiSelector';
import { useChat } from '../../hooks/useChat';

export const ChatPanel: React.FC = () => {
  const messages = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  
  const setOnboardingComplete = useChatStore(state => state.setOnboardingComplete);
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 15;
      setIsAtBottom(isNearBottom);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming, isAtBottom]);

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
    <div 
      ref={scrollRef} 
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 pt-4 pb-4 md:px-8 md:pt-20 md:pb-8 scroll-smooth bg-transparent relative z-10 flex flex-col"
    >
      <div className="max-w-[1280px] mx-auto w-full flex-1 flex flex-col gap-1">
        <AnimatePresence mode="wait">
          {!hasCompletedOnboarding ? (
            !showEmojiSelector ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <GeminiWelcome onStart={handleStart} />
              </motion.div>
            ) : (
              <motion.div
                key="emoji"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <EmojiSelector onSelect={handleSelectEmoji} onSkip={handleSkipEmoji} />
              </motion.div>
            )
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col gap-0.5 w-full mt-auto"
            >
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const next = messages[idx + 1];
                const isFirstInGroup = !prev || prev.isHidden || prev.role !== msg.role;
                const isLastInGroup = !next || next.isHidden || next.role !== msg.role;
                // Add extra top margin when a new "speaker" starts
                const needsGroupSep = isFirstInGroup && idx > 0;
                return (
                  <motion.div 
                    layout="position"
                    key={msg.id || idx} 
                    className={needsGroupSep ? 'mt-4' : ''}
                  >
                    <MessageBubble
                      message={msg}
                      isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                      isFirstInGroup={isFirstInGroup}
                      isLastInGroup={isLastInGroup}
                    />
                  </motion.div>
                );
              })}
              <div className="h-[140px] md:h-[180px] shrink-0" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
