import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

const GeminiSparkleAvatar = () => (
  <div className="w-8 h-8 rounded-full gemini-sparkle-icon flex items-center justify-center shrink-0 mt-0.5">
    <svg className="w-4 h-4" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z"
        fill="white"
      />
    </svg>
  </div>
);

const TypingIndicator = () => (
  <span className="inline-flex items-center gap-1 ml-1 align-middle">
    <span
      className="w-1.5 h-1.5 rounded-full bg-gemini-blue animate-pulse"
      style={{ animationDelay: '0ms', animationDuration: '1s' }}
    />
    <span
      className="w-1.5 h-1.5 rounded-full bg-gemini-blue animate-pulse"
      style={{ animationDelay: '200ms', animationDuration: '1s' }}
    />
    <span
      className="w-1.5 h-1.5 rounded-full bg-gemini-blue animate-pulse"
      style={{ animationDelay: '400ms', animationDuration: '1s' }}
    />
  </span>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const [showTechChain, setShowTechChain] = useState(false);

  return (
    <div
      className={`flex items-start gap-3 animate-message-in ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* AI avatar */}
      {!isUser && <GeminiSparkleAvatar />}

      <div
        className={`max-w-[75%] md:max-w-[calc(100%-44px)] ${
          isUser
            ? 'bg-gemini-blue text-white rounded-3xl rounded-br-lg shadow-md'
            : ''
        }`}
      >
        {/* Message content */}
        <div
          className={
            isUser
              ? 'px-5 py-3 font-sans text-[15px] leading-relaxed'
              : 'gemini-prose'
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <TypingIndicator />}
            </>
          )}
        </div>

        {/* Tech Chain 展示 */}
        {!isUser && message.techChain && (
          <div className="mt-2">
            <button
              onClick={() => setShowTechChain(!showTechChain)}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors duration-200 ease-md3-standard flex items-center gap-1"
            >
              <span>{showTechChain ? '收起详情' : '查看详情'}</span>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ease-md3-standard ${
                  showTechChain ? 'rotate-180' : ''
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {showTechChain && (
              <div className="mt-2 bg-surface-container rounded-xl p-3 text-sm space-y-2 animate-slide-up">
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant">意图分析</span>
                  <span className="text-gemini-blue font-medium">
                    {(message.techChain as any).intent}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant">使用模型</span>
                  <span className="text-gemini-blue font-medium">
                    {(message.techChain as any).model}
                  </span>
                </div>
                {(message.techChain as any).fsmState && (
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant">状态机</span>
                    <span className="text-gemini-blue font-medium">
                      {(message.techChain as any).fsmState}
                    </span>
                  </div>
                )}
                {(message.techChain as any).ragChunks > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant">知识检索</span>
                    <span className="text-gemini-blue font-medium">
                      {(message.techChain as any).ragChunks} 段内容
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
