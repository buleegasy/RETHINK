import React from 'react';
import { motion } from 'framer-motion';

interface EmojiSelectorProps {
  onSelect: (emojiText: string) => void;
  onSkip: () => void;
}

const EMOJI_OPTIONS = [
  { emoji: '😔', colorClass: 'hover:border-amber-400 hover:shadow-amber-500/10' },
  { emoji: '🫠', colorClass: 'hover:border-blue-400 hover:shadow-blue-500/10' },
  { emoji: '😭', colorClass: 'hover:border-red-400 hover:shadow-red-500/10' },
  { emoji: '🥺', colorClass: 'hover:border-pink-400 hover:shadow-pink-500/10' },
  { emoji: '🤡', colorClass: 'hover:border-purple-400 hover:shadow-purple-500/10' },
  { emoji: '😑', colorClass: 'hover:border-cyan-400 hover:shadow-cyan-500/10' },
  { emoji: '😡', colorClass: 'hover:border-red-600 hover:shadow-red-700/10' },
  { emoji: '🤢', colorClass: 'hover:border-green-400 hover:shadow-green-500/10' },
  { emoji: '💤', colorClass: 'hover:border-slate-400 hover:shadow-slate-500/10' },
  { emoji: '😰', colorClass: 'hover:border-teal-400 hover:shadow-teal-500/10' },
  { emoji: '🫂', colorClass: 'hover:border-indigo-400 hover:shadow-indigo-500/10' },
  { emoji: '🖕', colorClass: 'hover:border-slate-500 hover:shadow-slate-600/10' },
  { emoji: '🙄', colorClass: 'hover:border-gray-400 hover:shadow-gray-500/10' },
  { emoji: '🤬', colorClass: 'hover:border-red-500 hover:shadow-red-600/10' },
  { emoji: '😵‍💫', colorClass: 'hover:border-purple-500 hover:shadow-purple-600/10' },
  { emoji: '😵', colorClass: 'hover:border-yellow-400 hover:shadow-yellow-500/10' },
  { emoji: '🤮', colorClass: 'hover:border-lime-500 hover:shadow-lime-600/10' },
  { emoji: '🤯', colorClass: 'hover:border-orange-500 hover:shadow-orange-600/10' },
];

export const EmojiSelector: React.FC<EmojiSelectorProps> = ({ onSelect, onSkip }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-fit md:min-h-[75vh] py-8 md:py-0 w-full px-4 select-none">
      {/* Header Text */}
      <motion.div
        initial={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-12 max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-serif font-light tracking-[0.1em] text-on-surface pb-1">
          此时此刻，你处于什么状态？
        </h2>
        <p className="mt-4 text-on-surface-variant text-sm md:text-base font-light tracking-wide">
          挑选一个代表你当下心境的表情包，开启我们的对话。
        </p>
      </motion.div>

      {/* Grid of Large Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 w-full max-w-3xl px-2">
        {EMOJI_OPTIONS.map((item, idx) => (
          <motion.div
            key={item.emoji}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -4 }}
            whileTap={{ scale: 0.95 }}
            transition={{ 
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.02 * idx 
            }}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(item.emoji)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(item.emoji);
              }
            }}
            className={`group relative aspect-square flex items-center justify-center rounded-3xl bg-surface-container/30 backdrop-blur-md border border-outline-variant/30 shadow-sm cursor-pointer hover:bg-surface-container/50 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-gemini-blue focus-visible:outline-none ${item.colorClass}`}
            aria-label={`选择状态: ${item.emoji}`}
          >
            {/* Hover aura effect */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br from-white to-transparent" />

            {/* Emoji character */}
            <span className="text-4xl md:text-5xl filter drop-shadow-sm group-hover:rotate-6 transition-transform duration-300">
              {item.emoji}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Skip button/link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        whileHover={{ opacity: 0.8 }}
        whileFocus={{ opacity: 0.8 }}
        onClick={onSkip}
        className="mt-12 text-on-surface-variant text-xs font-light tracking-widest uppercase cursor-pointer hover:text-on-surface transition-all duration-300 border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-gemini-blue rounded px-2 py-1"
      >
        跳过，直接输入文字
      </motion.button>
    </div>
  );
};
