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
              <div className="mt-2 w-full select-none animate-slide-up">
                <button
                  onClick={() => setShowTechChain(!showTechChain)}
                  className="group flex items-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high/30 transition-all duration-200 uppercase tracking-wide cursor-pointer"
                >
                  <Brain className={`w-3.5 h-3.5 transition-transform duration-300 ${showTechChain ? 'scale-110 text-gemini-blue' : 'group-hover:rotate-12'}`} />
                  <span>{showTechChain ? '收起推演' : '后台推演'}</span>
                  {showTechChain ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence initial={false}>
                  {showTechChain && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="bg-surface-container/60 backdrop-blur-md border border-outline/10 shadow-lg rounded-2xl p-4 text-[12.5px] space-y-4 max-w-[450px] w-full font-sans text-on-surface animate-fade-in">
                        
                        {/* ─── Model & Latency Header ─── */}
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant/50 pb-2 border-b border-outline-variant/10">
                          <div className="flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5" />
                            <span>模型：{tc.model || 'Gemini 1.5 Pro'}</span>
                          </div>
                          {tc.latencyMs !== undefined && (
                            <div className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5" />
                              <span>延迟：{tc.latencyMs}ms</span>
                            </div>
                          )}
                        </div>

                        {/* ─── 意图识别 (Intent Recognition) ─── */}
                        <div className="space-y-2.5">
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-gemini-blue" />
                            <span>意图识别</span>
                          </p>

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-on-surface-variant/60 w-14 shrink-0">倾诉意图</span>
                            <span className={`bg-surface-container-high px-2 py-0.5 rounded-md font-semibold text-[11.5px] ${INTENT_COLOR[tc.intent] || 'text-on-surface'}`}>
                              {INTENT_LABEL[tc.intent] ?? tc.intent}
                            </span>
                            {tc.intentEmotion && tc.intentEmotion !== 'Neutral' && (
                              <span className="bg-surface-container-high px-2 py-0.5 rounded-md text-amber-500 dark:text-amber-400 font-semibold text-[11px]">
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
                                        ? 'linear-gradient(90deg, #34A853, #4285F4)'
                                        : tc.intentConfidence >= 50
                                        ? 'linear-gradient(90deg, #F9AB00, #EA4335)'
                                        : 'linear-gradient(90deg, #9AA0A6, #5F6368)',
                                    }}
                                  />
                                </div>
                                <span className="text-on-surface-variant text-[11px] w-7 text-right font-medium">{tc.intentConfidence}%</span>
                              </div>
                            </div>
                          )}

                          {tc.intentTriggers && tc.intentTriggers.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-on-surface-variant/60 w-14 shrink-0 pt-0.5">命中特征</span>
                              <div className="flex flex-wrap gap-1">
                                {tc.intentTriggers.map((word, i) => (
                                  <span key={i} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                    {word}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ─── FSM 会话阶段 (Session State) ─── */}
                        {tc.fsmState && (() => {
                          const meta = FSM_STATE_META[tc.fsmState as FSMState];
                          return (
                            <div className="space-y-2 pt-2.5 border-t border-outline-variant/10">
                              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                                <Activity className="w-3 h-3 text-gemini-purple" />
                                <span>干预会话阶段</span>
                              </p>
                              
                              <div className="flex items-start gap-3 bg-surface-container/40 p-2.5 rounded-xl border border-outline/5">
                                <div className="text-2xl mt-0.5 select-none">{meta?.icon || '🤖'}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-semibold text-on-surface text-[12.5px]">
                                      {meta?.label || tc.fsmState}
                                    </span>
                                    {tc.fsmTrigger && (
                                      <span className="text-[10px] bg-gemini-purple/10 text-gemini-purple px-1.5 py-0.5 rounded font-medium">
                                        触发：{tc.fsmTrigger}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-on-surface-variant text-[11px] leading-relaxed">
                                    {meta?.description || '当前对话处于正常跟进状态'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* ─── CBT 评估分析 (CBT Cognitive Assessment) ─── */}
                        {tc.reasoningDeduction && (
                          <div className="space-y-2 pt-2.5 border-t border-outline-variant/10">
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                              <Brain className="w-3 h-3 text-stage-orange" />
                              <span>认知偏差评估</span>
                            </p>

                            <div className="bg-surface-container/40 p-2.5 rounded-xl border border-outline/5 space-y-2 text-[11.5px]">
                              {tc.reasoningDeduction.cognitive_distortion && (
                                <div className="flex items-start gap-2">
                                  <span className="text-on-surface-variant/60 w-16 shrink-0 font-medium">认知扭曲</span>
                                  <span className="text-stage-red font-semibold bg-stage-red/5 px-1.5 py-0.5 rounded">
                                    {tc.reasoningDeduction.cognitive_distortion}
                                  </span>
                                </div>
                              )}
                              {tc.reasoningDeduction.emotional_core && (
                                <div className="flex items-start gap-2">
                                  <span className="text-on-surface-variant/60 w-16 shrink-0 font-medium">核心情绪</span>
                                  <span className="text-on-surface font-medium">
                                    {tc.reasoningDeduction.emotional_core}
                                  </span>
                                </div>
                              )}
                              {tc.reasoningDeduction.intervention_strategy && (
                                <div className="flex items-start gap-2">
                                  <span className="text-on-surface-variant/60 w-16 shrink-0 font-medium">引导策略</span>
                                  <span className="text-stage-green font-medium">
                                    {tc.reasoningDeduction.intervention_strategy}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ─── 知识库检索 (RAG retrieval) ─── */}
                        {tc.ragChunks !== undefined && tc.ragChunks > 0 && (
                          <div className="space-y-2.5 pt-2.5 border-t border-outline-variant/10">
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-semibold flex items-center gap-1">
                              <Database className="w-3 h-3 text-stage-green" />
                              <span>干预知识库检索</span>
                              <span className="ml-auto bg-stage-green/10 text-stage-green px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                命中 {tc.ragChunks} 条
                              </span>
                            </p>

                            {tc.ragSnippets && tc.ragSnippets.length > 0 && (
                              <div className="space-y-2">
                                {tc.ragSnippets.map((snippet, i) => {
                                  const isExpanded = expandedRag === i;
                                  const score = tc.ragScores?.[i] ?? 0;
                                  const source = tc.ragSources?.[i] ?? '专业干预手册';
                                  return (
                                    <div key={i} className="rounded-xl border border-outline-variant/10 overflow-hidden bg-surface-container/20">
                                      <button
                                        onClick={() => setExpandedRag(isExpanded ? null : i)}
                                        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-surface-container-high/40 transition-colors cursor-pointer"
                                      >
                                        <div
                                          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: score >= 0.8
                                              ? '#34A853'
                                              : score >= 0.6
                                              ? '#F9AB00'
                                              : '#9AA0A6',
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10.5px] text-stage-green font-semibold truncate max-w-[150px]">
                                              {source}
                                            </span>
                                            <span className="text-[10px] text-on-surface-variant/50">
                                              {score ? `${Math.round(score * 100)}% 相关` : ''}
                                            </span>
                                          </div>
                                          <p className={`text-on-surface-variant text-[11px] leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                            {snippet}
                                          </p>
                                        </div>
                                      </button>
                                      {isExpanded && (
                                        <div className="px-3 pb-2.5 pt-0 bg-surface-container-high/10 border-t border-outline-variant/5">
                                          <p className="text-on-surface-variant text-[11px] leading-relaxed pt-1.5 whitespace-pre-wrap">
                                            {snippet}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ─── 安全干预预警 (Safety Alert) ─── */}
                        {tc.riskLevel && tc.riskLevel !== 'low' && (
                          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-error-container/20 border border-error/10 text-error text-[11px]">
                            <ShieldAlert className="w-4 h-4 shrink-0 text-error mt-0.5 animate-pulse" />
                            <div>
                              <p className="font-semibold">实时危机预警等级：{tc.riskLevel === 'crisis' ? '极高危险' : tc.riskLevel === 'high' ? '高风险' : '中风险'}</p>
                              {tc.riskReason && <p className="mt-0.5 opacity-80">{tc.riskReason}</p>}
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
