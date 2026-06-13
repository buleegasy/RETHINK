import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Layers,
  Route,
  Search,
  ShieldAlert,
  XCircle,
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
  <section className="rounded-xl border border-outline-variant/30 bg-surface-container-high/35 overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/20">
      <span className="text-on-surface-variant/65">{icon}</span>
      <h4 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-on-surface-variant/75">{title}</h4>
    </div>
    <div className="p-3 space-y-2.5">{children}</div>
  </section>
);

const AuditRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 items-start">
    <span className="text-[11px] leading-5 text-on-surface-variant/55">{label}</span>
    <div className="min-w-0 text-[11.5px] leading-5 text-on-surface-variant">{children}</div>
  </div>
);

const AuditBadge: React.FC<{
  children: React.ReactNode;
  tone?: string;
}> = ({ children, tone = 'text-on-surface-variant' }) => (
  <span className={`inline-flex items-center rounded-md border border-outline-variant/25 bg-surface-container-high px-2 py-0.5 text-[11px] font-medium ${tone}`}>
    {children}
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

  const tc = message.techChain as any;
  const ragSources = safeArray<string>(tc?.ragSources);
  const ragSnippets = safeArray<string>(tc?.ragSnippets);
  const ragScores = safeArray<number>(tc?.ragScores);
  const retrievedChunks = safeArray<{ source_type?: string; title?: string; use?: string }>(tc?.retrievedEvidence?.retrieved_chunks);
  const usedFrameworks = safeArray<string>(tc?.retrievedEvidence?.used_framework);
  const riskLevel = tc?.riskLevel || 'low';

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

  if (message.isHidden) return null;

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
          <div className="mt-1 w-full max-w-[min(520px,88vw)]">
            <button
              onClick={() => setShowTechChain(!showTechChain)}
              className="group text-[11px] text-on-surface-variant/45 hover:text-on-surface-variant/80 transition-all duration-300 flex items-center gap-1.5 uppercase tracking-wide"
              aria-expanded={showTechChain}
            >
              <GitBranch className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>{showTechChain ? '收起推演' : '后台推演'}</span>
              {showTechChain ? <ChevronUp className="w-3 h-3 opacity-70" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
            </button>

            {showTechChain && (
              <div className="mt-2 rounded-2xl border border-outline-variant/45 bg-surface/95 shadow-lg backdrop-blur-xl animate-slide-up overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/25 bg-surface-container/65">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-on-surface-variant/55">Inference Audit</p>
                      <h3 className="mt-0.5 text-[13px] font-semibold text-on-surface">后台推演链路</h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AuditBadge tone={RISK_COLOR[riskLevel] || 'text-on-surface-variant'}>
                        {RISK_LABEL[riskLevel] ?? riskLevel}
                      </AuditBadge>
                      <AuditBadge tone={tc.ragRetrievalMode === 'forced_safety' ? 'text-red-400' : 'text-sky-400'}>
                        {tc.ragRetrievalMode === 'forced_safety' ? '安全优先' : '常规路由'}
                      </AuditBadge>
                      <AuditBadge tone={tc.ragChunks > 0 ? 'text-emerald-400' : 'text-on-surface-variant/60'}>
                        RAG {tc.ragChunks > 0 ? `${tc.ragChunks}` : '0'}
                      </AuditBadge>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-outline-variant/25 bg-surface-container-high/45 px-2.5 py-2">
                      <p className="text-[10px] text-on-surface-variant/55">Intent</p>
                      <p className={`mt-0.5 truncate text-[12px] font-semibold ${INTENT_COLOR[tc.intent] || 'text-on-surface'}`}>
                        {INTENT_LABEL[tc.intent] ?? tc.intent}
                      </p>
                    </div>
                    <div className="rounded-lg border border-outline-variant/25 bg-surface-container-high/45 px-2.5 py-2">
                      <p className="text-[10px] text-on-surface-variant/55">State</p>
                      <p className="mt-0.5 truncate text-[12px] font-semibold text-gemini-purple">
                        {tc.fsmState ? fsmLabel(tc.fsmState) : '未记录'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-outline-variant/25 bg-surface-container-high/45 px-2.5 py-2">
                      <p className="text-[10px] text-on-surface-variant/55">Confidence</p>
                      <p className={`mt-0.5 truncate text-[12px] font-semibold ${scoreTone((tc.intentConfidence ?? 0) / 100)}`}>
                        {tc.intentConfidence !== undefined ? `${tc.intentConfidence}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-[12px]">
                  <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr] items-center gap-2 text-[10.5px] text-on-surface-variant/70">
                    <div className="h-7 w-7 rounded-full bg-surface-container-high border border-outline-variant/25 flex items-center justify-center text-gemini-blue">
                      <Brain className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">意图识别</span>
                    <div className="h-px bg-outline-variant/35" />
                    <div className="h-7 w-7 rounded-full bg-surface-container-high border border-outline-variant/25 flex items-center justify-center text-gemini-purple">
                      <Route className="w-3.5 h-3.5" />
                    </div>
                    <div className="h-px bg-outline-variant/35" />
                    <span className="truncate">状态 / 知识检索</span>
                  </div>

                  <AuditSection icon={<Activity className="w-3.5 h-3.5" />} title="Intent Router">
                    <AuditRow label="分类">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <AuditBadge tone={INTENT_COLOR[tc.intent] || 'text-on-surface'}>
                          {INTENT_LABEL[tc.intent] ?? tc.intent}
                        </AuditBadge>
                        {tc.intentEmotion && (
                          <AuditBadge tone={tc.intentEmotion === 'Neutral' ? 'text-on-surface-variant/65' : 'text-amber-400'}>
                            {EMOTION_LABEL[tc.intentEmotion] ?? tc.intentEmotion}
                          </AuditBadge>
                        )}
                      </div>
                    </AuditRow>
                    {tc.intentConfidence !== undefined && (
                      <AuditRow label="置信度">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-surface-container-high overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${tc.intentConfidence}%`,
                                background: tc.intentConfidence >= 80
                                  ? 'linear-gradient(90deg, #22c55e, #06b6d4)'
                                  : tc.intentConfidence >= 50
                                  ? 'linear-gradient(90deg, #eab308, #f97316)'
                                  : 'linear-gradient(90deg, #94a3b8, #64748b)',
                              }}
                            />
                          </div>
                          <span className={`w-9 text-right font-medium ${scoreTone((tc.intentConfidence ?? 0) / 100)}`}>{tc.intentConfidence}%</span>
                        </div>
                      </AuditRow>
                    )}
                    {tc.intentTriggers && tc.intentTriggers.length > 0 && (
                      <AuditRow label="触发证据">
                        <div className="flex flex-wrap gap-1">
                          {tc.intentTriggers.map((w: string, i: number) => (
                            <span key={i} className="rounded-md border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[11px] text-amber-400">
                              {w}
                            </span>
                          ))}
                        </div>
                      </AuditRow>
                    )}
                  </AuditSection>

                  <AuditSection icon={<ShieldAlert className="w-3.5 h-3.5" />} title="Risk Layer">
                    <AuditRow label="等级">
                      <AuditBadge tone={RISK_COLOR[riskLevel] || 'text-on-surface-variant'}>
                        {RISK_LABEL[riskLevel] ?? riskLevel}
                      </AuditBadge>
                    </AuditRow>
                    {tc.riskReason && (
                      <AuditRow label="判定">{tc.riskReason}</AuditRow>
                    )}
                    <AuditRow label="含义">
                      <span className="text-on-surface-variant/80">
                        {riskLevel === 'crisis'
                          ? '进入危机路径，优先安全与现实求助。'
                          : riskLevel === 'high'
                          ? '存在明显安全敏感线索，需要提高关注强度。'
                          : riskLevel === 'medium'
                          ? '需要持续关注与温和引导。'
                          : '当前轮风险较低。'}
                      </span>
                    </AuditRow>
                  </AuditSection>

                  <AuditSection icon={<GitBranch className="w-3.5 h-3.5" />} title="State Machine">
                    <AuditRow label="当前阶段">
                      <AuditBadge tone="text-gemini-purple">{tc.fsmState ? fsmLabel(tc.fsmState) : '未记录'}</AuditBadge>
                    </AuditRow>
                    {tc.fsmTrigger && (
                      <AuditRow label="转移触发">
                        <span className="font-mono text-[11px] text-on-surface-variant/85 break-all">{tc.fsmTrigger}</span>
                      </AuditRow>
                    )}
                    {tc.reasoningDeduction && (
                      <div className="grid gap-2 pt-1">
                        {tc.reasoningDeduction.cognitive_distortion && (
                          <AuditRow label="认知线索">{tc.reasoningDeduction.cognitive_distortion}</AuditRow>
                        )}
                        {tc.reasoningDeduction.emotional_core && (
                          <AuditRow label="情绪核心">{tc.reasoningDeduction.emotional_core}</AuditRow>
                        )}
                        {tc.reasoningDeduction.intervention_strategy && (
                          <AuditRow label="干预策略">{tc.reasoningDeduction.intervention_strategy}</AuditRow>
                        )}
                      </div>
                    )}
                  </AuditSection>

                  <AuditSection icon={<Database className="w-3.5 h-3.5" />} title="Knowledge Retrieval">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-surface-container-high/55 border border-outline-variant/20 p-2">
                        <div className="flex items-center gap-1.5 text-on-surface-variant/55">
                          {tc.ragQueried ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3" />}
                          <span className="text-[10px]">Query</span>
                        </div>
                        <p className="mt-1 text-[11.5px] font-semibold text-on-surface">{tc.ragQueried ? '触发' : '未触发'}</p>
                      </div>
                      <div className="rounded-lg bg-surface-container-high/55 border border-outline-variant/20 p-2">
                        <div className="flex items-center gap-1.5 text-on-surface-variant/55">
                          <ShieldAlert className={`w-3 h-3 ${tc.ragRetrievalMode === 'forced_safety' ? 'text-red-400' : 'text-sky-400'}`} />
                          <span className="text-[10px]">Mode</span>
                        </div>
                        <p className="mt-1 text-[11.5px] font-semibold text-on-surface">
                          {tc.ragRetrievalMode === 'forced_safety' ? '安全强制' : 'AI 判断'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-container-high/55 border border-outline-variant/20 p-2">
                        <div className="flex items-center gap-1.5 text-on-surface-variant/55">
                          <Gauge className="w-3 h-3 text-emerald-400" />
                          <span className="text-[10px]">Hits</span>
                        </div>
                        <p className={`mt-1 text-[11.5px] font-semibold ${tc.ragChunks > 0 ? 'text-emerald-400' : 'text-on-surface-variant/65'}`}>
                          {tc.ragChunks ?? 0} 条
                        </p>
                      </div>
                    </div>

                    {tc.ragQuery && (
                      <AuditRow label="检索式">
                        <span className="text-on-surface break-words">{tc.ragQuery}</span>
                      </AuditRow>
                    )}
                    {tc.ragDecisionReason && (
                      <AuditRow label="决策理由">{tc.ragDecisionReason}</AuditRow>
                    )}
                    {usedFrameworks.length > 0 && (
                      <AuditRow label="框架">
                        <div className="flex flex-wrap gap-1">
                          {usedFrameworks.map((framework, i) => (
                            <AuditBadge key={i}>{framework}</AuditBadge>
                          ))}
                        </div>
                      </AuditRow>
                    )}
                    {tc.ragChunks <= 0 && (
                      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-high/35 px-3 py-2 text-[11.5px] leading-relaxed text-on-surface-variant">
                        未注入外部知识片段。本轮回复依据当前会话状态、意图识别结果与系统内置安全规则生成。
                      </div>
                    )}
                  </AuditSection>

                  {ragSnippets.length > 0 && (
                    <AuditSection icon={<FileText className="w-3.5 h-3.5" />} title="Retrieved Evidence">
                      <div className="space-y-2">
                        {ragSnippets.map((snippet: string, i: number) => (
                          <div key={i} className="rounded-xl border border-outline-variant/30 bg-surface-container/55 overflow-hidden">
                            <button
                              onClick={() => setExpandedRag(expandedRag === i ? null : i)}
                              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-surface-container-high/55 transition-colors"
                            >
                              <div className="mt-0.5 h-6 w-6 rounded-lg bg-surface-container-high border border-outline-variant/25 flex items-center justify-center shrink-0">
                                <Search className={`w-3.5 h-3.5 ${scoreTone(ragScores[i])}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-on-surface font-medium truncate max-w-[220px]">
                                    {ragSources[i] ?? retrievedChunks[i]?.title ?? '知识库'}
                                  </span>
                                  {ragScores[i] !== undefined && (
                                    <span className={`text-[10px] font-medium ${scoreTone(ragScores[i])}`}>
                                      {Math.round(ragScores[i] * 100)}%
                                    </span>
                                  )}
                                  <span className="ml-auto text-on-surface-variant/40">
                                    {expandedRag === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11.5px] leading-relaxed text-on-surface-variant line-clamp-2">
                                  {snippet}
                                </p>
                              </div>
                            </button>
                            {expandedRag === i && (
                              <div className="px-3 pb-3 pt-2 bg-surface-container-high/25 border-t border-outline-variant/20">
                                <p className="text-[11.5px] leading-relaxed text-on-surface-variant">
                                  {snippet}
                                  <span className="text-on-surface-variant/45 italic"> …摘要截至前80字</span>
                                </p>
                                {retrievedChunks[i]?.use && (
                                  <p className="mt-2 rounded-lg bg-surface-container/70 px-2.5 py-2 text-[11px] leading-relaxed text-on-surface-variant/80">
                                    用途：{retrievedChunks[i].use}
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
                    <div className="flex items-center justify-between gap-3 px-1 text-[10.5px] text-on-surface-variant/45">
                      <span className="inline-flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        Model
                      </span>
                      <span className="font-mono truncate">{tc.model}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
