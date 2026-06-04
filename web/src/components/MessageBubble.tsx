import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

const GeminiSparkleAvatar = ({ isStreaming }: { isStreaming?: boolean }) => (
  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 transition-all duration-500 ${isStreaming ? 'scale-110 shadow-glow' : ''}`}>
    {isStreaming && (
      <div className="absolute inset-0 bg-gemini-blue blur-md opacity-60 animate-pulse-gentle rounded-full" />
    )}
    <div 
      className={`w-full h-full rounded-full gemini-sparkle-icon flex items-center justify-center relative z-10`}
      style={isStreaming ? { animation: 'spin 4s linear infinite' } : {}}
    >
      <svg className="w-4.5 h-4.5" viewBox="0 0 28 28" fill="none">
        <path
          d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z"
          fill="white"
        />
      </svg>
    </div>
  </div>
);

const TypingIndicator = () => (
  <span className="inline-block ml-1 animate-pulse-gentle">
    <span className="gemini-gradient-text text-xl font-bold align-middle leading-none">...</span>
  </span>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const [showTechChain, setShowTechChain] = useState(false);

  return (
    <div
      className={`flex items-start gap-4 animate-message-in w-full ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* AI avatar */}
      {!isUser && <GeminiSparkleAvatar isStreaming={isStreaming} />}

      <div
        className={`max-w-[85%] md:max-w-[calc(100%-56px)] ${
          isUser
            ? 'bg-surface-container-high text-on-surface rounded-bubble rounded-br-[12px] px-6 py-3.5 shadow-sm border border-outline-variant/30'
            : 'pt-0.5'
        }`}
      >
        {/* Message content */}
        <div
          className={
            isUser
              ? 'font-sans text-[15px] leading-relaxed'
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
          <div className="mt-4">
            <button
              onClick={() => setShowTechChain(!showTechChain)}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors duration-200 ease-md3-standard flex items-center gap-1 bg-surface-container-high/50 hover:bg-surface-container-high px-3 py-1.5 rounded-full"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{showTechChain ? '隐藏后台意图' : '查看后台意图'}</span>
            </button>

            {showTechChain && (
              <div className="mt-3 bg-surface-container rounded-2xl p-4 text-[13px] space-y-2.5 animate-slide-up border border-outline-variant/50">
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant w-16">意图分类</span>
                  <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-gemini-blue font-medium">
                    {(message.techChain as any).intent}
                  </span>
                </div>
                {(message.techChain as any).fsmState && (
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant w-16">CBT状态</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-gemini-purple font-medium">
                      {(message.techChain as any).fsmState}
                    </span>
                  </div>
                )}
                {(message.techChain as any).ragChunks > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant w-16">知识检索</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-stage-green font-medium">
                      匹配到 {(message.techChain as any).ragChunks} 个相关策略片段
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
