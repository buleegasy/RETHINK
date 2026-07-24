import React, { useState } from 'react';
import type { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import type { TechChain, FSMState } from '../../types';
import { FSM_STATE_META } from '../../types';
import { StageBadge } from './StageBadge';

/** 意图分类 → 中文学术术语映射 */
const INTENT_LABEL: Record<string, string> = {
  casual: '日常闲聊',
  emotional: '情绪倾诉',
  crisis: '危机预警',
  ambiguous: '意图不明',
};

/** 情绪子类型 → 中文 */
const EMOTION_LABEL: Record<string, string> = {
  Anxiety: '焦虑',
  Depression: '抑郁',
  Anger: '愤怒',
  Neutral: '中性',
};

/** 意图类型对应的颜色 */
const INTENT_COLOR: Record<string, string> = {
  casual: 'text-gemini-blue',
  emotional: 'text-stage-orange',
  crisis: 'text-stage-red',
  ambiguous: 'text-on-surface-variant',
};

interface TechReasoningPanelProps {
  techChain: TechChain;
}

export const TechReasoningPanel: FC<TechReasoningPanelProps> = ({ techChain: tc }) => {
  const [showTechChain, setShowTechChain] = useState(false);
  const [expandedRag, setExpandedRag] = useState<number | null>(null);

  return (
    <div className="mt-1 w-full select-none animate-slide-up ms-4">
      <button
        type="button"
        onClick={() => setShowTechChain(!showTechChain)}
        className="flex items-center gap-1.5 py-0.5 px-1.5 rounded text-[10px] font-mono text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container/80 transition-all duration-200 cursor-pointer"
      >
        <span>{showTechChain ? '收起推演日志' : '展开系统推演'}</span>
        {showTechChain ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      <AnimatePresence initial={false}>
        {showTechChain && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
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
                    <span className="col-span-9 flex items-center gap-1.5">
                      <StageBadge fsmState={tc.fsmState} />
                    </span>
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
                              type="button"
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
  );
};
