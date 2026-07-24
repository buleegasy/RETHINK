import React, { useState } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeminiWelcome } from './GeminiWelcome';
import { EmojiSelector } from './EmojiSelector';
import { useChatStore } from '../../store/chatStore';
import { useChat } from '../../hooks/useChat';

export const OnboardingGuide: FC = () => {
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const setOnboardingComplete = useChatStore((state) => state.setOnboardingComplete);
  const { sendMessage } = useChat();

  const handleStart = () => {
    setShowEmojiSelector(true);
  };

  const handleSelectEmoji = (emojiText: string) => {
    setOnboardingComplete(true);
    sendMessage(emojiText);
  };

  const handleSkipEmoji = () => {
    setOnboardingComplete(true);
  };

  return (
    <AnimatePresence mode="wait">
      {!showEmojiSelector ? (
        <motion.div
          key="welcome"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col justify-center w-full h-full"
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
      )}
    </AnimatePresence>
  );
};
