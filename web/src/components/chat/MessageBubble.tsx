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
      <div className={`flex flex-col gap-0.5 max-w-[88%] md:max-w-[75%] lg:max-w-[65%] ${isUser ? 'items-end' : 'items-start'}`}>

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
      </div>
    </div>
  );
};
