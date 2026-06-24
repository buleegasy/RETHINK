import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, FSMState } from '../../types';
import { FSM_STATE_META } from '../../types';
import { ReThinkLogo } from '../layout/ReThinkLogo';
import { Brain, ChevronDown, ChevronUp, Cpu, Activity, Database, Sparkles, ShieldAlert } from 'lucide-react';

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

/** 意图类型对应的颜色 */
const INTENT_COLOR: Record<string, string> = {
  casual:    'text-sky-500 dark:text-sky-400',
  emotional: 'text-amber-500 dark:text-amber-400',
  crisis:    'text-red-500 dark:text-red-400',
  ambiguous: 'text-slate-500 dark:text-slate-400',
};

/** 将 FSMState 键转换为中文标签 */
function fsmLabel(state: string): string {
  return FSM_STATE_META[state as FSMState]?.label ?? state;
}

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
  const [showTechChain, setShowTechChain] = useState(false);
  const [expandedRag, setExpandedRag] = useState<number | null>(null);

  const tc = message.techChain;

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
          <>
            {/* ── AI Bubbles (one per sentence chunk) ── */}
            {chunks.map((chunk, idx) => (
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
            ))}

            {/* Collapsible Tech Chain Panel */}
            {!isUser && tc && (
              <div className="mt-1.5 w-full select-none animate-slide-up">
                <button
                  onClick={() => setShowTechChain(!showTechChain)}
                  className="flex items-center gap-1.5 py-0.5 px-1.5 rounded text-[10px] font-mono text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high/30 transition-all duration-200 cursor-pointer"
                >
                  <span>{showTechChain ? 'CLOSE_TRACE' : 'SYSTEM_TRACE'}</span>
                  {showTechChain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <AnimatePresence initial={false}>
                  {showTechChain && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 shadow-xl rounded-xl p-3 text-[10.5px] font-mono text-slate-300 max-w-[440px] w-full space-y-3">
                        
                        {/* ─── SYSTEM ─── */}
                        <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-800 text-[10px] text-slate-500 font-semibold">
                          <div>ENGINE: <span className="text-slate-300">{tc.model || 'unknown'}</span></div>
                          <div className="text-right">LATENCY: <span className="text-slate-300">{tc.latencyMs !== undefined ? `${tc.latencyMs}ms` : 'N/A'}</span></div>
                        </div>

                        {/* ─── CLASSIFIER ─── */}
                        <div className="space-y-1">
                          <div className="text-slate-500 text-[9px] uppercase tracking-wider font-bold border-b border-slate-900 pb-0.5">INTENT_CLASSIFIER</div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-3 text-slate-500">intent:</span>
                            <span className="col-span-9 text-sky-400 font-semibold">{tc.intent}</span>
                          </div>
                          {tc.intentConfidence !== undefined && (
                            <div className="grid grid-cols-12 gap-1 font-mono">
                              <span className="col-span-3 text-slate-500">conf:</span>
                              <span className="col-span-9 flex items-center gap-2">
                                <span className="text-slate-200">{tc.intentConfidence}%</span>
                                <div className="w-24 h-1 bg-slate-900 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-sky-500 rounded"
                                    style={{ width: `${tc.intentConfidence}%` }}
                                  />
                                </div>
                              </span>
                            </div>
                          )}
                          {tc.intentEmotion && tc.intentEmotion !== 'Neutral' && (
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-slate-500">emotion:</span>
                              <span className="col-span-9 text-amber-500 font-medium">{tc.intentEmotion}</span>
                            </div>
                          )}
                          {tc.intentTriggers && tc.intentTriggers.length > 0 && (
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-slate-500">tokens:</span>
                              <span className="col-span-9 text-slate-400 break-all">
                                [{tc.intentTriggers.join(', ')}]
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ─── STATE_MACHINE ─── */}
                        {tc.fsmState && (
                          <div className="space-y-1">
                            <div className="text-slate-500 text-[9px] uppercase tracking-wider font-bold border-b border-slate-900 pb-0.5">STATE_MACHINE</div>
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-slate-500">state:</span>
                              <span className="col-span-9 text-purple-400 font-semibold">{tc.fsmState}</span>
                            </div>
                            {tc.fsmTrigger && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-slate-500">trigger:</span>
                                <span className="col-span-9 text-purple-300/80">{tc.fsmTrigger}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── CBT_DEDUCTION ─── */}
                        {tc.reasoningDeduction && (
                          <div className="space-y-1">
                            <div className="text-slate-500 text-[9px] uppercase tracking-wider font-bold border-b border-slate-900 pb-0.5">CBT_DIAGNOSTICS</div>
                            {tc.reasoningDeduction.cognitive_distortion && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-slate-500">distortion:</span>
                                <span className="col-span-9 text-red-400 font-semibold">{tc.reasoningDeduction.cognitive_distortion}</span>
                              </div>
                            )}
                            {tc.reasoningDeduction.emotional_core && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-slate-500">core_feel:</span>
                                <span className="col-span-9 text-slate-300">{tc.reasoningDeduction.emotional_core}</span>
                              </div>
                            )}
                            {tc.reasoningDeduction.intervention_strategy && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-slate-500">strategy:</span>
                                <span className="col-span-9 text-green-400">{tc.reasoningDeduction.intervention_strategy}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── KNOWLEDGE_RETRIEVAL ─── */}
                        {((tc.ragChunks !== undefined && tc.ragChunks > 0) || tc.ragQuery) && (
                          <div className="space-y-1">
                            <div className="text-slate-500 text-[9px] uppercase tracking-wider font-bold border-b border-slate-900 pb-0.5">KNOWLEDGE_RETRIEVAL (RAG)</div>
                            {tc.ragQuery && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-slate-500">query:</span>
                                <span className="col-span-9 text-slate-400 italic truncate" title={tc.ragQuery}>"{tc.ragQuery}"</span>
                              </div>
                            )}
                            {tc.ragRetrievalMode && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-slate-500">mode:</span>
                                <span className="col-span-9 text-slate-300">{tc.ragRetrievalMode}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-slate-500">hits:</span>
                              <span className="col-span-9 text-green-400 font-semibold">{tc.ragChunks || 0} chunks</span>
                            </div>
                            {tc.ragSnippets && tc.ragSnippets.length > 0 && (
                              <div className="mt-1.5 space-y-1 pl-2 border-l border-slate-800">
                                {tc.ragSnippets.map((snippet, i) => {
                                  const isExpanded = expandedRag === i;
                                  const score = tc.ragScores?.[i] ?? 0;
                                  const source = tc.ragSources?.[i] ?? 'kb_manual';
                                  return (
                                    <div key={i} className="text-[10px] space-y-0.5">
                                      <button
                                        onClick={() => setExpandedRag(isExpanded ? null : i)}
                                        className="flex items-center gap-1.5 text-[9.5px] text-slate-400 hover:text-slate-200 transition-colors text-left cursor-pointer font-mono"
                                      >
                                        <span className={score >= 0.8 ? 'text-green-500' : 'text-amber-500'}>{isExpanded ? '▼' : '▶'}</span>
                                        <span className="text-slate-300 font-semibold truncate max-w-[150px]">{source}</span>
                                        <span className="text-slate-500">({score ? `${Math.round(score * 100)}%` : '0%'})</span>
                                      </button>
                                      {isExpanded && (
                                        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/50 text-[10px] text-slate-400 whitespace-pre-wrap leading-normal font-sans">
                                          {snippet}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── SYSTEM_ALERT ─── */}
                        {tc.riskLevel && tc.riskLevel !== 'low' && (
                          <div className="flex gap-1.5 p-1.5 rounded bg-red-950/30 border border-red-900/50 text-red-400 text-[10px]">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                            <div>
                              <div className="font-semibold uppercase">CRISIS_ALERT: {tc.riskLevel}</div>
                              {tc.riskReason && <div className="opacity-80 leading-normal">{tc.riskReason}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};
