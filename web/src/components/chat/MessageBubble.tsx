import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import type { ChatMessage } from '../../types';
import { ReThinkLogo } from '../layout/ReThinkLogo';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  /** Whether this is the first message in a consecutive group from the same sender */
  isFirstInGroup?: boolean;
  /** Whether this is the last message in a consecutive group from the same sender */
  isLastInGroup?: boolean;
}

const TypingIndicator = () => (
  <span className="inline-flex items-center gap-0.5 ml-1">
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '300ms' }} />
  </span>
);

/** iOS-style tail rendered as an absolutely positioned triangle */
const BubbleTail = ({ isUser }: { isUser: boolean }) => (
  <span
    aria-hidden
    style={{
      position: 'absolute',
      bottom: 0,
      ...(isUser ? { right: -7 } : { left: -7 }),
      width: 14,
      height: 14,
      clipPath: isUser
        ? 'polygon(0 0, 100% 0, 0 100%)'   // user: bottom-right corner cut
        : 'polygon(0 0, 100% 0, 100% 100%)', // ai: bottom-left corner cut
      background: isUser ? '#4285F4' : '#E8EDF2',
    }}
  />
);


export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  const isUser = message.role === 'user';

  // Split AI messages into multiple short bubbles (WhatsApp style)
  const chunks = React.useMemo(() => {
    if (isUser) return [message.content];

    // Don't split complex markdown
    const isComplexMarkdown = /```|^[*-]\s|^\d+\.\s|#/m.test(message.content);
    if (isComplexMarkdown || !message.content) return [message.content];

    const rawChunks = message.content.match(/[^。！？!?\n]+[。！？!?\n]*/g);
    if (rawChunks) {
      return rawChunks.map(s => s.trim()).filter(Boolean);
    }
    return [message.content];
  }, [message.content, isUser]);

  /**
   * Pill-style radius with grouped-message corner squishing.
   * Full pill (rounded-full) except the "tail" corner of the first/last
   * bubble in a group gets a tighter radius to suggest continuity.
   */
  const aiBubbleRadius = (idx: number) => {
    const isFirst = idx === 0 && isFirstInGroup;
    const isLast = idx === chunks.length - 1 && isLastInGroup;
    if (isFirst && isLast) return 'rounded-[22px] rounded-bl-[6px]'; // single
    if (isFirst)           return 'rounded-[22px] rounded-bl-[10px]';
    if (isLast)            return 'rounded-[22px] rounded-bl-[6px]';
    return 'rounded-[22px] rounded-l-[10px]';
  };

  const userBubbleRadius = isLastInGroup
    ? 'rounded-[22px] rounded-br-[6px]'
    : 'rounded-[22px] rounded-r-[10px]';

  if (message.isHidden) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`flex items-end gap-2 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >

      {/* AI Avatar — only show on the last message in a group (WhatsApp style) */}
      {!isUser && (
        <div className="w-8 h-8 shrink-0 mb-0.5">
          {isLastInGroup ? (
            <div className="relative w-8 h-8 flex items-center justify-center text-primary dark:text-primary-light">
              {isStreaming && (
                <div className="absolute inset-0 bg-primary/20 blur-sm rounded-full animate-pulse" />
              )}
              <ReThinkLogo className="w-8 h-8 relative z-10" isThinking={isStreaming} />
            </div>
          ) : (
            /* Spacer when avatar is hidden for middle-of-group messages */
            <div className="w-8 h-8" />
          )}
        </div>
      )}

      {/* Message column */}
      <div className={`flex flex-col gap-1 max-w-[82%] md:max-w-[75%] lg:max-w-[65%] ${isUser ? 'items-end' : 'items-start'}`}>

        {isUser ? (
          /* ── User Bubble ── */
          <div
            className={`relative ${userBubbleRadius} px-4 py-2.5 text-[15px] leading-relaxed font-sans bg-gemini-blue text-white shadow-sm`}
          >
            <p className="whitespace-pre-wrap">{chunks[0]}</p>
            {isLastInGroup && <BubbleTail isUser={true} />}
          </div>
        ) : (
          /* ── AI Bubbles (one per sentence chunk) ── */
          chunks.map((chunk, idx) => (
            <div
              key={idx}
              className={`relative ${aiBubbleRadius(idx)} bg-surface-container text-on-surface px-4 py-2.5 text-[15px] leading-relaxed font-sans shadow-sm`}
            >
              <div className="gemini-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {chunk}
                </ReactMarkdown>
              </div>
              {isStreaming && idx === chunks.length - 1 && <TypingIndicator />}
              {/* Tail on the last chunk of the last group bubble */}
              {idx === chunks.length - 1 && isLastInGroup && <BubbleTail isUser={false} />}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};
