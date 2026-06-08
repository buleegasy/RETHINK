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
  LowMood:    '低落',
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

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming,
  isFirstInGroup = true,
  isLastInGroup = true,
}) => {
  if (message.isHidden) return null;

  const isUser = message.role === 'user';
  const [showTechChain, setShowTechChain] = useState(false);
  const [expandedRag, setExpandedRag] = useState<number | null>(null);

  // Split AI messages into multiple short bubbles (WhatsApp style)
  const chunks = React.useMemo(() => {
    if (isUser) return [message.content];

    // Don't split complex markdown
    const isComplexMarkdown = /```|^[*-]\s|^\d+\.\s|#/m.test(message.content);
    if (isComplexMarkdown || !message.content) return [message.content];

    const rawChunks = message.content.match(/[^。！？!\?\n]+[。！？!\?\n]*/g);
    if (rawChunks) {
      return rawChunks.map(s => s.trim()).filter(Boolean);
    }
    return [message.content];
  }, [message.content, isUser]);

  const tc = message.techChain as any;

  // WhatsApp bubble corner radius logic:
  // First in group: standard rounded, tail corner is less rounded
  // Middle: fully rounded on the tail side
  // Last in group: tail corner more rounded (visually "separated")
  const aiBubbleRadius = (idx: number) => {
    const isFirst = idx === 0 && isFirstInGroup;
    const isLast = idx === chunks.length - 1 && isLastInGroup;
    if (isFirst && isLast) return 'rounded-2xl rounded-tl-sm'; // single bubble
    if (isFirst) return 'rounded-2xl rounded-tl-sm rounded-bl-lg';
    if (isLast) return 'rounded-2xl rounded-tl-lg rounded-bl-sm';
    return 'rounded-2xl rounded-l-lg';
  };

  const userBubbleRadius = 'rounded-2xl rounded-br-sm';

  return (
    <div className={`flex items-end gap-2 w-full animate-message-in ${isUser ? 'justify-end' : 'justify-start'}`}>

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
      <div className={`flex flex-col gap-0.5 max-w-[70%] md:max-w-[60%] ${isUser ? 'items-end' : 'items-start'}`}>

        {isUser ? (
          /* ── User Bubble ── */
          <div
            className={`${userBubbleRadius} px-4 py-2.5 text-[15px] leading-relaxed font-sans`}
            style={{ background: 'var(--color-primary, #1a1a2e)', color: '#fff' }}
          >
            <p className="whitespace-pre-wrap">{chunks[0]}</p>
          </div>
        ) : (
          /* ── AI Bubbles (one per sentence chunk) ── */
          chunks.map((chunk, idx) => (
            <div
              key={idx}
              className={`${aiBubbleRadius(idx)} bg-surface-container text-on-surface px-4 py-2.5 text-[15px] leading-relaxed font-sans shadow-sm`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {chunk}
              </ReactMarkdown>
              {isStreaming && idx === chunks.length - 1 && <TypingIndicator />}
            </div>
          ))
        )}

        {/* Tech Chain — only on AI messages */}
        {!isUser && tc && (
          <div className="mt-1 w-full">
            <button
              onClick={() => setShowTechChain(!showTechChain)}
              className="text-[11px] text-on-surface-variant/35 hover:text-on-surface-variant/70 transition-all duration-300 flex items-center gap-1 uppercase tracking-wide"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span>{showTechChain ? '收起推演' : '后台推演'}</span>
            </button>

            {showTechChain && (
              <div className="mt-2 bg-surface-container rounded-2xl p-4 text-[12.5px] space-y-4 animate-slide-up border border-outline-variant/50 max-w-sm">

                {/* ─── 意图识别 ─── */}
                <div className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                    <span>⚡</span> 意图识别
                  </p>
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

                {/* ─── 知识检索 ─── */}
                {tc.ragChunks > 0 && (
                  <div className="space-y-2.5 pt-0.5 border-t border-outline-variant/20">
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                      <span>🔍</span> 知识库检索
                      <span className="ml-1 bg-surface-container-high text-stage-green px-1.5 py-0 rounded font-bold normal-case tracking-normal">
                        {tc.ragChunks} 条
                      </span>
                    </p>
                    {tc.ragSnippets && tc.ragSnippets.length > 0 && tc.ragSnippets.map((snippet: string, i: number) => (
                      <div key={i} className="rounded-xl border border-outline-variant/30 overflow-hidden">
                        <button
                          onClick={() => setExpandedRag(expandedRag === i ? null : i)}
                          className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-container-high/60 transition-colors"
                        >
                          <div
                            className="mt-1 w-1.5 h-1.5 rounded-full shrink-0 self-center"
                            style={{
                              background: tc.ragScores?.[i] >= 0.8 ? '#4ade80'
                                : tc.ragScores?.[i] >= 0.6 ? '#facc15' : '#94a3b8',
                            }}
                          />
                          <div className="flex-1 min-w-0">
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
                            <p className="text-on-surface-variant text-[11.5px] leading-relaxed line-clamp-2">
                              {snippet}
                            </p>
                          </div>
                        </button>
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
