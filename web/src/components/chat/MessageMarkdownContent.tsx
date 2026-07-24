import React from 'react';
import type { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

const TypingIndicator: FC = () => (
  <span className="inline-flex items-center gap-0.5 ml-1 relative">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        animate={{ opacity: [0.4, 1, 0.4], y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15, ease: 'easeInOut' }}
        className="w-1.5 h-1.5 rounded-full bg-current relative z-10"
      />
    ))}
  </span>
);

interface MessageMarkdownContentProps {
  chunk: string;
  aiBubbleRadiusClass: string;
  isStreaming: boolean;
  isLastChunk: boolean;
}

export const MessageMarkdownContent: FC<MessageMarkdownContentProps> = React.memo(({
  chunk,
  aiBubbleRadiusClass,
  isStreaming,
  isLastChunk,
}) => {
  const isGlowActive = isStreaming && isLastChunk;
  const showSweep = !isStreaming && !isLastChunk;
  return (
    <div
      className={`relative ${aiBubbleRadiusClass} px-4 py-3 text-[15px] md:text-[15.5px] leading-relaxed font-sans shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-outline-variant/25 transition-all duration-300 text-[var(--ai-bubble-text)] ${
        isGlowActive
          ? 'streaming-glow-bubble bg-surface-container/90 backdrop-blur-md'
          : 'bg-[var(--ai-bubble-bg)] backdrop-blur-[24px]'
      } ${
        showSweep ? 'ai-bubble-sweep' : ''
      }`}
    >
      <div className="gemini-prose leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {chunk}
        </ReactMarkdown>
      </div>
      {isStreaming && isLastChunk && <TypingIndicator />}
    </div>
  );
});

MessageMarkdownContent.displayName = 'MessageMarkdownContent';
