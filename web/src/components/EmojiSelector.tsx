import React from 'react';
import { motion } from 'framer-motion';

interface EmojiSelectorProps {
  onSelect: (emojiText: string) => void;
}

const EMOJI_OPTIONS = [
  {
    emoji: '🫠',
    label: '累瘫了',
    description: '精力耗尽，感觉身体被掏空',
    text: '🫠',
    colorClass: 'hover:border-blue-400 hover:shadow-blue-500/10'
  },
  {
    emoji: '💥',
    label: '要炸了',
    description: '憋了一肚子气，快要憋坏了',
    text: '💥',
    colorClass: 'hover:border-amber-400 hover:shadow-amber-500/10'
  },
  {
    emoji: '😭',
    label: '很难受',
    description: '心里全是委屈和心酸',
    text: '😭',
    colorClass: 'hover:border-red-400 hover:shadow-red-500/10'
  },
  {
    emoji: '😑',
    label: '好迷茫',
    description: '不知道方向，整个人空空的',
    text: '😑',
    colorClass: 'hover:border-cyan-400 hover:shadow-cyan-500/10'
  },
  {
    emoji: '🤡',
    label: '难为情',
    description: '自我嘲讽，尴尬又无奈',
    text: '🤡',
    colorClass: 'hover:border-purple-400 hover:shadow-purple-500/10'
  }
];

export const EmojiSelector: React.FC<EmojiSelectorProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] w-full px-4 select-none">
      {/* Header Text */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-display font-medium gemini-gradient-text pb-1">
          此时此刻，你处于什么状态？
        </h2>
        <p className="mt-3 text-on-surface-variant text-base font-sans">
          挑选一个代表你当下心境的表情包，开启我们的对话。
        </p>
      </motion.div>

      {/* Grid of Large Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full max-w-2xl px-2">
        {EMOJI_OPTIONS.map((item, idx) => (
          <motion.div
            key={item.emoji}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, duration: 0.5, ease: 'easeOut' }}
            onClick={() => onSelect(item.text)}
            className={`group relative flex flex-col items-center justify-center p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-md border border-outline-variant/60 shadow-md cursor-pointer hover:scale-102 active:scale-98 transition-all duration-300 ${item.colorClass}`}
          >
            {/* Hover aura effect */}
            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br from-white to-transparent" />

            {/* Emoji character */}
            <span className="text-5xl md:text-6xl filter drop-shadow-sm group-hover:rotate-6 transition-transform duration-300">
              {item.emoji}
            </span>

            {/* Label */}
            <strong className="mt-4 text-on-surface text-lg font-sans font-medium">
              {item.label}
            </strong>

            {/* Sub-description */}
            <span className="mt-2 text-on-surface-variant/70 text-xs font-sans text-center line-clamp-2">
              {item.description}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
