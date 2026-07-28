import React, { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { OnboardingGuide } from './OnboardingGuide';

export const ChatPanel: FC = () => {
  const {
    messages,
    isStreaming,
    hasCompletedOnboarding,
  } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      isStreaming: state.isStreaming,
      hasCompletedOnboarding: state.hasCompletedOnboarding,
    }))
  );

  const scrollRef = useRef<HTMLDivElement>(null);
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

  return (
    <div 
      ref={scrollRef} 
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-3 pt-4 pb-4 md:px-8 md:pt-20 md:pb-8 scroll-smooth bg-transparent relative z-10 flex flex-col"
    >
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-1">
        <AnimatePresence mode="wait">
          {!hasCompletedOnboarding ? (
            <OnboardingGuide />
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
                const needsGroupSep = isFirstInGroup && idx > 0;
                const isCurrentStreamingMessage = isStreaming && idx === messages.length - 1;

                return (
                  <motion.div 
                    layout={isCurrentStreamingMessage ? false : "position"}
                    key={msg.id || idx} 
                    className={needsGroupSep ? 'mt-8' : ''}
                    transition={{
                      layout: { type: "spring", stiffness: 150, damping: 20, mass: 0.8 }
                    }}
                  >
                    <MessageBubble
                      message={msg}
                      isStreaming={isCurrentStreamingMessage && msg.role === 'assistant'}
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
