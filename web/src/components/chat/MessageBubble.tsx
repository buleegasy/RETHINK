import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  GitBranch,
  ShieldAlert,
} from 'lucide-react';
import type { ChatMessage, FSMState } from '../../types';
import { FSM_STATE_META } from '../../types';
import { ReThinkLogo } from '../layout/ReThinkLogo';

/** 意图分类 → 中文学术术语映射 */
const INTENT_LABEL: Record<string, string> = {
  casual:    '日常闲聊',
  emotional: '情绪倾诉',
  crisis:    '危机预警',
  ambiguous: '意图不明',
  academic_stress: '学业压力',
  peer_relationship: '同伴关系',
  family_pressure: '家庭压力',
  ambiguous_risk: '模糊风险',
  source_trace: '来源追踪',
};

/** 情绪子类型 → 中文 */
const EMOTION_LABEL: Record<string, string> = {
  Anxiety:    '焦虑',
  LowMood:    '低落',
  Anger:      '愤怒',
  Neutral:    '中性',
};

const RISK_LABEL: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  crisis: '危机',
};

const RISK_COLOR: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  crisis: 'text-red-400',
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
  academic_stress: 'text-orange-400',
  peer_relationship: 'text-cyan-400',
  family_pressure: 'text-violet-400',
  ambiguous_risk: 'text-rose-400',
  source_trace: 'text-emerald-400',
};

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function scoreTone(score?: number): string {
  if (score === undefined) return 'text-on-surface-variant/60';
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.6) return 'text-amber-400';
  return 'text-on-surface-variant/70';
}

const AuditSection: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <section className="border-t border-slate-300/30 pt-3 pb-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-slate-400">{icon}</span>
      <h4 className="text-[9px] font-mono tracking-widest uppercase text-slate-500">[{title}]</h4>
    </div>
    <div className="space-y-2">{children}</div>
  </section>
);

const AuditRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 items-start font-mono text-[10px]">
    <span className="tracking-widest text-slate-400 uppercase">{label}</span>
    <div className="min-w-0 text-slate-600">{children}</div>
  </div>
);

const AuditBadge: React.FC<{
  children: React.ReactNode;
  tone?: string;
}> = ({ children, tone = 'text-slate-500' }) => (
  <span className={`inline-block font-mono text-[9px] tracking-widest uppercase ${tone}`}>
    [{children}]
  </span>
);

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
  const isUser = message.role === 'user';
  const [showTechChain, setShowTechChain] = useState(false);
  const [expandedRag, setExpandedRag] = useState<number | null>(null);

  const tc = message.techChain as any;
  const ragSources = safeArray<string>(tc?.ragSources);
  const ragSnippets = safeArray<string>(tc?.ragSnippets);
  const ragScores = safeArray<number>(tc?.ragScores);
  const retrievedChunks = safeArray<{ source_type?: string; title?: string; use?: string }>(tc?.retrievedEvidence?.retrieved_chunks);
  const usedFrameworks = safeArray<string>(tc?.retrievedEvidence?.used_framework);
  const riskLevel = tc?.riskLevel || 'low';

  if (message.isHidden) return null;

  return (
    <div className={`flex flex-col w-full animate-message-in mb-6 ${isFirstInGroup ? 'pt-6 border-t border-slate-300/30' : ''}`}>
      <div className={`flex items-start gap-4 md:gap-8 w-full`}>
        
        {/* Left Avatar Column (Only AI shows an avatar, or user shows a label) */}
        <div className="w-8 md:w-12 shrink-0 pt-1">
          {isFirstInGroup && (
            isUser ? (
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">You</span>
            ) : (
              <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-800">
                {isStreaming && (
                  <div className="absolute inset-0 bg-slate-200 blur-md rounded-full animate-pulse" />
                )}
                <ReThinkLogo className="w-full h-full relative z-10" isThinking={isStreaming} />
              </div>
            )
          )}
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {isUser ? (
            <div className="text-[16px] md:text-[18px] leading-relaxed font-sans font-light tracking-wide text-slate-500 whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className="prose prose-slate max-w-none prose-p:leading-loose prose-p:my-4 prose-p:font-light prose-p:tracking-wide text-[16px] md:text-[18px] text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && <TypingIndicator />}
            </div>
          )}

          {/* Tech Chain Schematic */}
          {!isUser && tc && isLastInGroup && (
            <div className="mt-8 w-full">
              <button
                onClick={() => setShowTechChain(!showTechChain)}
                className="group text-[9px] font-mono text-slate-400 hover:text-slate-600 transition-all duration-300 flex items-center gap-2 uppercase tracking-[0.2em]"
                aria-expanded={showTechChain}
              >
                <span>[ {showTechChain ? 'Hide Audit' : 'Show Audit'} ]</span>
                <GitBranch className="w-3 h-3 opacity-70" strokeWidth={1} />
              </button>

              {showTechChain && (
                <div className="mt-4 border border-slate-300/50 bg-white/20 backdrop-blur-3xl animate-slide-up">
                  <div className="p-4 md:p-6 font-mono text-[10px] text-slate-500">
                    
                    {/* Header line */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-300/30 pb-4">
                      <div>
                        <h3 className="text-[12px] tracking-widest text-slate-700 uppercase">Inference Schematic</h3>
                        <p className="mt-1 text-slate-400 tracking-wider">SYSTEM_ROUTING_TRACE</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <AuditBadge tone={RISK_COLOR[riskLevel] || 'text-slate-500'}>
                          RISK:{RISK_LABEL[riskLevel] ?? riskLevel}
                        </AuditBadge>
                        <AuditBadge tone={tc.ragRetrievalMode === 'forced_safety' ? 'text-red-400' : 'text-slate-500'}>
                          MODE:{tc.ragRetrievalMode === 'forced_safety' ? 'SAFETY' : 'DEFAULT'}
                        </AuditBadge>
                        <AuditBadge tone={tc.ragChunks > 0 ? 'text-emerald-500' : 'text-slate-500'}>
                          RAG_HITS:{tc.ragChunks ?? '0'}
                        </AuditBadge>
                      </div>
                    </div>

                    {/* Matrix Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div>
                        <p className="tracking-widest uppercase text-slate-400 mb-2">[INTENT]</p>
                        <p className={`text-[11px] tracking-widest uppercase ${INTENT_COLOR[tc.intent] || 'text-slate-700'}`}>
                          {INTENT_LABEL[tc.intent] ?? tc.intent}
                        </p>
                      </div>
                      <div>
                        <p className="tracking-widest uppercase text-slate-400 mb-2">[STATE]</p>
                        <p className="text-[11px] tracking-widest text-slate-700 uppercase">
                          {tc.fsmState ? fsmLabel(tc.fsmState) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="tracking-widest uppercase text-slate-400 mb-2">[CONFIDENCE]</p>
                        <p className={`text-[11px] tracking-widest ${scoreTone((tc.intentConfidence ?? 0) / 100)}`}>
                          {tc.intentConfidence !== undefined ? `${tc.intentConfidence}%` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <AuditSection icon={<Activity className="w-3.5 h-3.5" />} title="Intent_Router">
                      <AuditRow label="Class">
                        {INTENT_LABEL[tc.intent] ?? tc.intent} 
                        {tc.intentEmotion && tc.intentEmotion !== 'Neutral' && ` // ${EMOTION_LABEL[tc.intentEmotion] ?? tc.intentEmotion}`}
                      </AuditRow>
                      {tc.intentTriggers && tc.intentTriggers.length > 0 && (
                        <AuditRow label="Triggers">
                          {tc.intentTriggers.map((w: string) => `"${w}"`).join(', ')}
                        </AuditRow>
                      )}
                    </AuditSection>

                    <AuditSection icon={<ShieldAlert className="w-3.5 h-3.5" />} title="Risk_Layer">
                      <AuditRow label="Level">{RISK_LABEL[riskLevel] ?? riskLevel}</AuditRow>
                      {tc.riskReason && <AuditRow label="Reason">{tc.riskReason}</AuditRow>}
                    </AuditSection>

                    <AuditSection icon={<GitBranch className="w-3.5 h-3.5" />} title="State_Machine">
                      <AuditRow label="Current">{tc.fsmState ? fsmLabel(tc.fsmState) : 'N/A'}</AuditRow>
                      {tc.fsmTrigger && <AuditRow label="Trigger">{tc.fsmTrigger}</AuditRow>}
                      {tc.reasoningDeduction && (
                        <div className="mt-3 border-l border-slate-300/50 pl-3 space-y-2">
                          {tc.reasoningDeduction.cognitive_distortion && (
                            <AuditRow label="Cognitive">{tc.reasoningDeduction.cognitive_distortion}</AuditRow>
                          )}
                          {tc.reasoningDeduction.emotional_core && (
                            <AuditRow label="Emotion">{tc.reasoningDeduction.emotional_core}</AuditRow>
                          )}
                          {tc.reasoningDeduction.intervention_strategy && (
                            <AuditRow label="Strategy">{tc.reasoningDeduction.intervention_strategy}</AuditRow>
                          )}
                        </div>
                      )}
                    </AuditSection>

                    <AuditSection icon={<Database className="w-3.5 h-3.5" />} title="Knowledge_Retrieval">
                      {tc.ragQuery && <AuditRow label="Query">"{tc.ragQuery}"</AuditRow>}
                      {tc.ragDecisionReason && <AuditRow label="Decision">{tc.ragDecisionReason}</AuditRow>}
                      {usedFrameworks.length > 0 && (
                        <AuditRow label="Framework">
                          {usedFrameworks.join(' + ')}
                        </AuditRow>
                      )}
                      {tc.ragChunks <= 0 && (
                        <div className="mt-2 text-slate-400 italic">
                          // No external knowledge injected. Proceeding with intrinsic patterns.
                        </div>
                      )}
                    </AuditSection>

                    {ragSnippets.length > 0 && (
                      <AuditSection icon={<FileText className="w-3.5 h-3.5" />} title="Retrieved_Evidence">
                        <div className="space-y-4 mt-2">
                          {ragSnippets.map((snippet: string, i: number) => (
                            <div key={i} className="border border-slate-300/30 p-3">
                              <button
                                onClick={() => setExpandedRag(expandedRag === i ? null : i)}
                                className="w-full flex items-center justify-between text-left hover:text-slate-700 transition-colors"
                              >
                                <span className="text-[11px] uppercase tracking-widest text-slate-600 truncate max-w-[80%]">
                                  {ragSources[i] ?? retrievedChunks[i]?.title ?? `SRC_${i+1}`}
                                </span>
                                <span className="flex items-center gap-2">
                                  {ragScores[i] !== undefined && (
                                    <span className={scoreTone(ragScores[i])}>
                                      [ {Math.round(ragScores[i] * 100)}% ]
                                    </span>
                                  )}
                                  {expandedRag === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </span>
                              </button>
                              {expandedRag === i && (
                                <div className="mt-3 pt-3 border-t border-slate-300/30">
                                  <p className="text-[11px] leading-relaxed text-slate-500 whitespace-pre-wrap">
                                    {snippet}
                                  </p>
                                  {retrievedChunks[i]?.use && (
                                    <p className="mt-2 text-[10px] text-slate-400 italic">
                                      // {retrievedChunks[i].use}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </AuditSection>
                    )}

                    {tc.model && (
                      <div className="mt-6 pt-4 border-t border-slate-300/30 flex justify-between uppercase tracking-widest text-[9px] text-slate-400">
                        <span>[EXEC_MODEL]</span>
                        <span>{tc.model}</span>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
