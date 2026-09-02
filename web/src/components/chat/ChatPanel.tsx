import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { GeminiWelcome } from './GeminiWelcome';
import { EmojiSelector } from './EmojiSelector';
import { useChat } from '../../hooks/useChat';
import type { ChatMessage } from '../../types';

interface MessageRowProps {
  msg: ChatMessage;
  idx: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isCurrentlyStreaming: boolean;
}

const MessageRow = React.memo(({ msg, idx, isFirstInGroup, isLastInGroup, isCurrentlyStreaming }: MessageRowProps) => {
  // Add extra top margin when a new "speaker" starts
  const needsGroupSep = isFirstInGroup && idx > 0;

  return (
    <motion.div
      layout="position"
      className={needsGroupSep ? 'mt-8' : ''}
      transition={{
        layout: { type: "spring", stiffness: 150, damping: 20, mass: 0.8 }
      }}
    >
      <MessageBubble
        message={msg}
        isStreaming={isCurrentlyStreaming}
        isFirstInGroup={isFirstInGroup}
        isLastInGroup={isLastInGroup}
      />
    </motion.div>
  );
});

MessageRow.displayName = 'MessageRow';

interface ChatPanelProps {
  onStartVoice?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onStartVoice }) => {
  const messages = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  
  const setOnboardingComplete = useChatStore(state => state.setOnboardingComplete);
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showEmojiSelector] = useState(false);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 15;
      isAtBottomRef.current = isNearBottom;
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isStreaming]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStart = () => {
    // 标记破冰/接待开始，自动发送隐式打招呼触发 AI 接待员首句话
    setOnboardingComplete(true);
    sendMessage('你好', undefined, undefined, { isHidden: true });
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
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-1">
        <AnimatePresence mode="wait">
          {!hasCompletedOnboarding ? (
            !showEmojiSelector ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col justify-center w-full h-full"
              >
                <GeminiWelcome onStart={() => {
                  setOnboardingComplete(true);
                  if (onStartVoice) {
                    onStartVoice();
                  } else {
                    sendMessage('你好', undefined, undefined, { isHidden: true });
                  }
                }} />
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
              className="flex flex-col gap-1 w-full mt-auto"
            >
              {messages.map((msg, idx) => {
                const prev = messages[idx - 1];
                const next = messages[idx + 1];
                const isFirstInGroup = !prev || prev.isHidden || prev.role !== msg.role;
                const isLastInGroup = !next || next.isHidden || next.role !== msg.role;
                const isCurrentlyStreaming = isStreaming && idx === messages.length - 1 && msg.role === 'assistant';

                return (
                  <MessageRow
                    key={msg.id || idx}
                    msg={msg}
                    idx={idx}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    isCurrentlyStreaming={isCurrentlyStreaming}
                  />
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
