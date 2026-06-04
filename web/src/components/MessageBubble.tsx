import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, FSMState } from '../types';
import { FSM_STATE_META } from '../types';
import { ReThinkLogo } from './ReThinkLogo';

/** 意图分类 → 中文学术术语映射 */
const INTENT_LABEL: Record<string, string> = {
  casual:    '日常闲聊',
  emotional: '情绪倾诉',
  crisis:    '危机预警',
  ambiguous: '意图不明',
};

/** 情绪子类型 → 中文 */
const EMOTION_LABEL: Record<string, string> = {
  Anxiety:    '焦虑',
  Depression: '抑郁',
  Anger:      '愤怒',
  Neutral:    '中性',
};

/** 将 FSMState 键转换为中文标签（回退为原始值） */
function fsmLabel(state: string): string {
  return FSM_STATE_META[state as FSMState]?.label ?? state;
}

/** 意图类型对应的颜色 */
const INTENT_COLOR: Record<string, string> = {
  casual:    'text-sky-400',
  emotional: 'text-amber-400',
  crisis:    'text-red-400',
  ambiguous: 'text-slate-400',
};

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

const AIAvatar = ({ isStreaming }: { isStreaming?: boolean }) => (
  <div className="w-12 h-12 shrink-0 relative flex items-center justify-center -mt-1 -ml-1">
    {isStreaming && (
      <div className="absolute inset-2 bg-primary blur-md opacity-20 animate-pulse-gentle rounded-full" />
    )}
    <div className="w-full h-full flex items-center justify-center relative z-10 text-primary dark:text-primary-light">
      <ReThinkLogo 
        className="w-[44px] h-[44px]" 
        isThinking={isStreaming}
      />
    </div>
  </div>
);

const TypingIndicator = () => (
  <span className="inline-block ml-1 animate-pulse-gentle">
    <span className="gemini-gradient-text text-xl font-bold align-middle leading-none">...</span>
  </span>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming }) => {
  if (message.isHidden) return null;

  const isUser = message.role === 'user';
  const [showTechChain, setShowTechChain] = useState(false);
  const [expandedRag, setExpandedRag] = useState<number | null>(null);

  // Split AI messages into chunks (like WhatsApp messages)
  const chunks = React.useMemo(() => {
    if (isUser) return [message.content];
    
    // Don't split if it's complex markdown (code blocks, lists, headers)
    const isComplexMarkdown = /```|^[*-]\s|^\d+\.\s|#/m.test(message.content);
    if (isComplexMarkdown || !message.content) return [message.content];

    // Split by punctuation (。！？!?) or newline, keeping punctuation attached to the sentence
    const rawChunks = message.content.match(/[^。！？!\?\n]+[。！？!\?\n]*/g);
    if (rawChunks) {
      return rawChunks.map(s => s.trim()).filter(Boolean);
    }
    return [message.content];
  }, [message.content, isUser]);

  const tc = message.techChain as any;

  return (
    <div
      className={`flex items-start gap-4 animate-message-in w-full ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* AI avatar */}
      {!isUser && <AIAvatar isStreaming={isStreaming} />}

      <div
        className={`max-w-[85%] md:max-w-[calc(100%-56px)] flex flex-col gap-2 ${
          isUser
            ? 'items-end'
            : 'items-start pt-1'
        }`}
      >
        {isUser ? (
          <div className="bg-surface-variant/40 text-on-surface rounded-bubble rounded-br-[12px] px-6 py-4 shadow-sm border border-outline-variant/20 font-sans text-[15px] leading-relaxed">
            <p className="whitespace-pre-wrap">{chunks[0]}</p>
          </div>
        ) : (
          chunks.map((chunk, idx) => (
            <div 
              key={idx} 
              className="bg-surface-container-low text-on-surface rounded-2xl rounded-tl-[4px] px-5 py-3.5 shadow-sm border border-outline-variant/10 gemini-prose animate-message-in w-fit"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {chunk}
              </ReactMarkdown>
              {isStreaming && idx === chunks.length - 1 && <TypingIndicator />}
            </div>
          ))
        )}

        {/* Tech Chain 展示 */}
        {!isUser && tc && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowTechChain(!showTechChain)}
              className="text-[11px] text-on-surface-variant/40 hover:text-on-surface-variant transition-all duration-300 flex items-center gap-1 uppercase tracking-wide"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>{showTechChain ? '收起推演' : '后台推演'}</span>
            </button>

            {showTechChain && (
              <div className="mt-3 bg-surface-container rounded-2xl p-4 text-[12.5px] space-y-4 animate-slide-up border border-outline-variant/50 max-w-sm">

                {/* ─── 意图识别区块 ─── */}
                <div className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                    <span>⚡</span> 意图识别
                  </p>

                  {/* 意图类型 */}
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant/60 w-14 shrink-0">分类</span>
                    <span className={`bg-surface-container-high px-2 py-0.5 rounded-md font-semibold ${INTENT_COLOR[tc.intent] || 'text-on-surface'}`}>
                      {INTENT_LABEL[tc.intent] ?? tc.intent}
                    </span>
                    {tc.intentEmotion && tc.intentEmotion !== 'Neutral' && (
                      <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-amber-400 font-medium text-[11px]">
                        {EMOTION_LABEL[tc.intentEmotion] ?? tc.intentEmotion}
                      </span>
                    )}
                  </div>

                  {/* 置信度进度条 */}
                  {tc.intentConfidence !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant/60 w-14 shrink-0">置信度</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${tc.intentConfidence}%`,
                              background: tc.intentConfidence >= 80
                                ? 'linear-gradient(90deg, #4ade80, #22d3ee)'
                                : tc.intentConfidence >= 50
                                ? 'linear-gradient(90deg, #facc15, #fb923c)'
                                : 'linear-gradient(90deg, #94a3b8, #64748b)',
                            }}
                          />
                        </div>
                        <span className="text-on-surface-variant text-[11px] w-7 text-right">{tc.intentConfidence}%</span>
                      </div>
                    </div>
                  )}

                  {/* 触发词标签 */}
                  {tc.intentTriggers && tc.intentTriggers.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-on-surface-variant/60 w-14 shrink-0 pt-0.5">触发词</span>
                      <div className="flex flex-wrap gap-1">
                        {tc.intentTriggers.map((w: string, i: number) => (
                          <span key={i} className="bg-amber-400/10 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded text-[11px]">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── 会话阶段 ─── */}
                {tc.fsmState && (
                  <div className="flex items-center gap-2 pt-0.5 border-t border-outline-variant/20">
                    <span className="text-on-surface-variant/60 w-14 shrink-0">会话阶段</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-gemini-purple font-medium">
                      {fsmLabel(tc.fsmState)}
                    </span>
                  </div>
                )}

                {/* ─── 知识检索区块 ─── */}
                {tc.ragChunks > 0 && (
                  <div className="space-y-2.5 pt-0.5 border-t border-outline-variant/20">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                      <span>🔍</span> 知识库检索
                      <span className="ml-1 bg-surface-container-high text-stage-green px-1.5 py-0 rounded font-bold normal-case tracking-normal">
                        {tc.ragChunks} 条
                      </span>
                    </p>

                    {/* 每条片段摘要 */}
                    {tc.ragSnippets && tc.ragSnippets.length > 0 && tc.ragSnippets.map((snippet: string, i: number) => (
                      <div key={i} className="rounded-xl border border-outline-variant/30 overflow-hidden">
                        <button
                          onClick={() => setExpandedRag(expandedRag === i ? null : i)}
                          className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-container-high/60 transition-colors"
                        >
                          {/* 相关度色块 */}
                          <div
                            className="mt-1 w-1 h-1 rounded-full shrink-0 self-center"
                            style={{
                              background: tc.ragScores?.[i] >= 0.8
                                ? '#4ade80'
                                : tc.ragScores?.[i] >= 0.6
                                ? '#facc15'
                                : '#94a3b8',
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            {/* 来源 + 相关度 */}
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[10px] text-stage-green font-medium truncate max-w-[120px]">
                                {tc.ragSources?.[i] ?? '知识库'}
                              </span>
                              {tc.ragScores?.[i] !== undefined && (
                                <span className="text-[10px] text-on-surface-variant/50">
                                  {Math.round(tc.ragScores[i] * 100)}% 相关
                                </span>
                              )}
                              <span className="ml-auto text-on-surface-variant/30 text-[10px]">
                                {expandedRag === i ? '▲' : '▼'}
                              </span>
                            </div>
                            {/* 摘要文本 */}
                            <p className="text-on-surface-variant text-[11.5px] leading-relaxed line-clamp-2">
                              {snippet}
                            </p>
                          </div>
                        </button>
                        {/* 展开后全文摘要 */}
                        {expandedRag === i && (
                          <div className="px-3 pb-2.5 pt-0 bg-surface-container-high/30 border-t border-outline-variant/20">
                            <p className="text-on-surface-variant text-[11.5px] leading-relaxed">
                              {snippet}
                              <span className="text-on-surface-variant/40 italic">…（摘要截至前80字）</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
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

