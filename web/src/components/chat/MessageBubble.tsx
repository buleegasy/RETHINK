import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage, FSMState } from '../../types';
import { FSM_STATE_META } from '../../types';
import { ReThinkLogo } from '../layout/ReThinkLogo';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

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
  casual:    'text-gemini-blue',
  emotional: 'text-stage-orange',
  crisis:    'text-stage-red',
  ambiguous: 'text-on-surface-variant',
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



interface MessageChunkProps {
  chunk: string;
  aiBubbleRadiusClass: string;
  isStreaming: boolean;
  isLastChunk: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

const MessageChunk = React.memo<MessageChunkProps>(({
  chunk,
  aiBubbleRadiusClass,
  isStreaming,
  isLastChunk,
  isFirstInGroup,
  isLastInGroup,
}) => {
  const isGlowActive = isStreaming && isLastChunk;
  return (
    <div
      className={`relative ${aiBubbleRadiusClass} text-on-surface px-4 py-2.5 text-[15px] leading-relaxed font-sans shadow-sm transition-all duration-300 ${
        isGlowActive
          ? 'streaming-glow-bubble bg-surface-container/90 backdrop-blur-md'
          : 'bg-surface-container/70 backdrop-blur-[20px] shadow-inner-light border border-white/20'
      }`}
    >
      <div className="gemini-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {chunk}
        </ReactMarkdown>
      </div>
      {isStreaming && isLastChunk && <TypingIndicator />}
    </div>
  );
});

MessageChunk.displayName = 'MessageChunk';


const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
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
    if (idx === 0 && isFirstInGroup) return 'rounded-[22px] rounded-tl-[4px]';
    return 'rounded-[22px]';
  };

  const userBubbleRadius = 'rounded-[22px]';

  if (message.isHidden) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`group relative flex items-start gap-2 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
    >

      {/* AI Avatar — only show on the first message in a group */}
      {!isUser && (
        <div className="w-8 h-8 shrink-0 mt-0.5 order-1">
          {isFirstInGroup ? (
            <div className="relative w-8 h-8 flex items-center justify-center text-on-surface dark:text-surface">
              {isStreaming && (
                <div className="absolute inset-0 bg-gemini-blue/20 blur-sm rounded-full animate-pulse" />
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
      <div className={`flex flex-col gap-1 max-w-[82%] md:max-w-[75%] lg:max-w-[65%] order-2 ${isUser ? 'items-end' : 'items-start'}`}>

        {isUser ? (
          /* ── User Bubble ── */
          <div
            className={`relative ${userBubbleRadius} px-4 py-2.5 text-[15px] md:text-[16px] leading-relaxed font-sans bg-primary-container text-[#1a1c1a] shadow-glow`}
          >
            <p className="whitespace-pre-wrap">{chunks[0]}</p>
          </div>
        ) : (
          <>
            {/* ── AI Bubbles (one per sentence chunk) ── */}
            {chunks.map((chunk, idx) => (
              <MessageChunk
                key={idx}
                chunk={chunk}
                aiBubbleRadiusClass={aiBubbleRadius(idx)}
                isStreaming={isStreaming && idx === chunks.length - 1}
                isLastChunk={idx === chunks.length - 1}
                isFirstInGroup={idx === 0 && isFirstInGroup}
                isLastInGroup={isLastInGroup}
              />
            ))}

            {/* Collapsible Tech Chain Panel */}
            {!isUser && tc && (
              <div className="mt-1 w-full select-none animate-slide-up ms-4">
                <button
                  onClick={() => setShowTechChain(!showTechChain)}
                  className="flex items-center gap-1.5 py-0.5 px-1.5 rounded text-[10px] font-mono text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container/80 transition-all duration-200 cursor-pointer"
                >
                  <span>{showTechChain ? '收起推演日志' : '展开系统推演'}</span>
                  {showTechChain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <AnimatePresence initial={false}>
                  {showTechChain && (
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0, originY: 0 }}
                      animate={{ opacity: 1, scaleY: 1, originY: 0 }}
                      exit={{ opacity: 0, scaleY: 0, originY: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden mt-1 w-full"
                    >
                      <div className="bg-surface-container/40 backdrop-blur-md border border-outline-variant/30 shadow-md rounded-xl p-3 text-[10.5px] font-mono text-on-surface max-w-[440px] w-full space-y-3">
                        
                        {/* ─── SYSTEM ─── */}
                        <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-outline-variant/30 text-[10px] text-on-surface-variant/60 font-semibold">
                          <div>驱动模型: <span className="text-on-surface">DeepSeek V4flash</span></div>
                          <div className="text-right">响应延迟: <span className="text-on-surface">{tc.latencyMs !== undefined ? `${tc.latencyMs}ms` : 'N/A'}</span></div>
                        </div>

                        {/* ─── CLASSIFIER ─── */}
                        <div className="space-y-1">
                          <div className="text-on-surface-variant/50 text-[9px] uppercase tracking-wider font-bold border-b border-outline-variant/20 pb-0.5">意图识别模块 (Classifier)</div>
                          <div className="grid grid-cols-12 gap-1">
                            <span className="col-span-3 text-on-surface-variant/60">主要意图:</span>
                            <span className={`col-span-9 font-semibold ${INTENT_COLOR[tc.intent] || 'text-on-surface'}`}>{INTENT_LABEL[tc.intent] || tc.intent}</span>
                          </div>
                          {tc.intentConfidence !== undefined && (
                            <div className="grid grid-cols-12 gap-1 font-mono">
                              <span className="col-span-3 text-on-surface-variant/60">置信度:</span>
                              <span className="col-span-9 flex items-center gap-2">
                                <span className="text-on-surface font-medium">{tc.intentConfidence}%</span>
                                <div className="w-24 h-1 bg-surface-container-high/60 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-gemini-blue rounded"
                                    style={{ width: `${tc.intentConfidence}%` }}
                                  />
                                </div>
                              </span>
                            </div>
                          )}
                          {tc.intentEmotion && tc.intentEmotion !== 'Neutral' && (
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-on-surface-variant/60">情绪底色:</span>
                              <span className="col-span-9 text-stage-orange font-medium">{EMOTION_LABEL[tc.intentEmotion] || tc.intentEmotion}</span>
                            </div>
                          )}
                          {tc.intentTriggers && tc.intentTriggers.length > 0 && (
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-on-surface-variant/60">触发词汇:</span>
                              <span className="col-span-9 text-on-surface-variant break-all">
                                [{tc.intentTriggers.join(', ')}]
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ─── STATE_MACHINE ─── */}
                        {tc.fsmState && (
                          <div className="space-y-1">
                            <div className="text-on-surface-variant/50 text-[9px] uppercase tracking-wider font-bold border-b border-outline-variant/20 pb-0.5">对话状态机 (FSM)</div>
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-on-surface-variant/60">当前阶段:</span>
                              <span className="col-span-9 text-gemini-purple font-semibold">{fsmLabel(tc.fsmState)}</span>
                            </div>
                            {tc.fsmTrigger && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-on-surface-variant/60">流转原因:</span>
                                <span className="col-span-9 text-gemini-purple/80">{tc.fsmTrigger}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── CBT_DEDUCTION ─── */}
                        {tc.reasoningDeduction && (
                          <div className="space-y-1">
                            <div className="text-on-surface-variant/50 text-[9px] uppercase tracking-wider font-bold border-b border-outline-variant/20 pb-0.5">CBT 认知诊断分析</div>
                            {tc.reasoningDeduction.cognitive_distortion && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-on-surface-variant/60">认知扭曲点:</span>
                                <span className="col-span-9 text-stage-red font-semibold">{tc.reasoningDeduction.cognitive_distortion}</span>
                              </div>
                            )}
                            {tc.reasoningDeduction.emotional_core && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-on-surface-variant/60">核心信念:</span>
                                <span className="col-span-9 text-on-surface">{tc.reasoningDeduction.emotional_core}</span>
                              </div>
                            )}
                            {tc.reasoningDeduction.intervention_strategy && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-on-surface-variant/60">干预策略:</span>
                                <span className="col-span-9 text-stage-green font-medium">{tc.reasoningDeduction.intervention_strategy}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── KNOWLEDGE_RETRIEVAL ─── */}
                        {((tc.ragChunks !== undefined && tc.ragChunks > 0) || tc.ragQuery) && (
                          <div className="space-y-1">
                            <div className="text-on-surface-variant/50 text-[9px] uppercase tracking-wider font-bold border-b border-outline-variant/20 pb-0.5">临床知识库检索 (RAG)</div>
                            {tc.ragQuery && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-on-surface-variant/60">检索目标:</span>
                                <span className="col-span-9 text-on-surface-variant italic truncate" title={tc.ragQuery}>"{tc.ragQuery}"</span>
                              </div>
                            )}
                            {tc.ragRetrievalMode && (
                              <div className="grid grid-cols-12 gap-1">
                                <span className="col-span-3 text-on-surface-variant/60">召回策略:</span>
                                <span className="col-span-9 text-on-surface-variant">{tc.ragRetrievalMode}</span>
                              </div>
                            )}
                            <div className="grid grid-cols-12 gap-1">
                              <span className="col-span-3 text-on-surface-variant/60">命中文段:</span>
                              <span className="col-span-9 text-stage-green font-semibold">{tc.ragChunks || 0} 条内容</span>
                            </div>
                            {tc.ragSnippets && tc.ragSnippets.length > 0 && (
                              <div className="mt-1.5 space-y-1 pl-2 border-l border-outline-variant/30">
                                {tc.ragSnippets.map((snippet, i) => {
                                  const isExpanded = expandedRag === i;
                                  const score = tc.ragScores?.[i] ?? 0;
                                  const source = tc.ragSources?.[i] ?? 'kb_manual';
                                  return (
                                    <div key={i} className="text-[10px] space-y-0.5">
                                      <button
                                        onClick={() => setExpandedRag(isExpanded ? null : i)}
                                        className="flex items-center gap-1.5 text-[9.5px] text-on-surface-variant hover:text-on-surface transition-colors text-left cursor-pointer font-mono"
                                      >
                                        <span className={score >= 0.8 ? 'text-stage-green' : 'text-stage-orange'}>{isExpanded ? '▼' : '▶'}</span>
                                        <span className="text-on-surface font-semibold truncate max-w-[150px]">{source}</span>
                                        <span className="text-on-surface-variant/60">({score ? `${Math.round(score * 100)}%` : '0%'})</span>
                                      </button>
                                      {isExpanded && (
                                        <div className="bg-surface/60 p-1.5 rounded border border-outline-variant/20 text-[10px] text-on-surface-variant whitespace-pre-wrap leading-normal font-sans">
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
                          <div className="flex gap-1.5 p-1.5 rounded bg-error/10 border border-error/20 text-stage-red text-[10px]">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-stage-red mt-0.5" />
                            <div>
                              <div className="font-semibold uppercase">危机系统警报: {tc.riskLevel}</div>
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

export const MessageBubble = React.memo(MessageBubbleComponent);
