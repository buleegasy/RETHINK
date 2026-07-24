import React from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types';
import { ReThinkLogo } from '../layout/ReThinkLogo';
import { MessageMarkdownContent } from './MessageMarkdownContent';
import { TechReasoningPanel } from './TechReasoningPanel';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  /** Whether this is the first message in a consecutive group from the same sender */
  isFirstInGroup?: boolean;
  /** Whether this is the last message in a consecutive group from the same sender */
  isLastInGroup?: boolean;
}

const MessageBubbleComponent: FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  isFirstInGroup = true,
}) => {
  const isUser = message.role === 'user';
  const tc = message.techChain;

  // Split AI messages into multiple short bubbles (WhatsApp style)
  const chunks = React.useMemo(() => {
    if (isUser) return [message.content];

    // Don't split complex markdown
    const isComplexMarkdown = /```|^[*-]\s|^\d+\.\s|#/m.test(message.content);
    if (isComplexMarkdown || !message.content) return [message.content];

    const rawChunks = message.content.match(/[^。！？!?\n]+[。！？!?\n]*/g);
    if (rawChunks) {
      return rawChunks.map((s) => s.trim()).filter(Boolean);
    }
    return [message.content];
  }, [message.content, isUser]);

  const aiBubbleRadius = (idx: number) => {
    if (idx === 0 && isFirstInGroup) return 'rounded-[4px_24px_24px_24px]';
    return 'rounded-[24px]';
  };

  const userBubbleRadius = isFirstInGroup ? 'rounded-[24px_4px_24px_24px]' : 'rounded-[24px]';

  if (message.isHidden) return null;

  return (
    <motion.div 
      layout={isStreaming ? false : "position"}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 120 }}
      className={`group relative flex items-start gap-2 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {/* AI Avatar — only show on the first message in a group */}
      {!isUser && (
        <div className="w-8 h-8 shrink-0 mt-0.5 order-1">
          {isFirstInGroup ? (
            <div className="relative w-8 h-8 flex items-center justify-center text-on-surface dark:text-surface">
              {!!isStreaming && (
                <div className="absolute inset-0 bg-gemini-blue/20 blur-sm rounded-full animate-pulse" />
              )}
              <ReThinkLogo className="w-8 h-8 relative z-10" isThinking={!!isStreaming} />
            </div>
          ) : (
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      {/* Message column */}
      <div className={`flex flex-col gap-1 max-w-[82%] md:max-w-[75%] lg:max-w-[65%] order-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {isUser ? (
          /* User Bubble */
          <div
            className={`relative ${userBubbleRadius} px-4 py-2.5 text-[15px] md:text-[16px] leading-relaxed font-sans bg-[var(--user-bubble-bg)] text-[var(--user-bubble-text)]`}
          >
            <p className="whitespace-pre-wrap">{chunks[0]}</p>
          </div>
        ) : (
          <>
            {/* AI Bubbles (one per sentence chunk) */}
            {chunks.map((chunk, idx) => (
              <MessageMarkdownContent
                key={idx}
                chunk={chunk}
                aiBubbleRadiusClass={aiBubbleRadius(idx)}
                isStreaming={!!isStreaming && idx === chunks.length - 1}
                isLastChunk={idx === chunks.length - 1}
              />
            ))}

            {/* Collapsible Tech Chain Panel */}
            {!isUser && tc && (
              <TechReasoningPanel techChain={tc} />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
