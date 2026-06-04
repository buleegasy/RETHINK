import React from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../store/chatStore';
import { FSM_STATE_META } from '../types';
import type { FSMState } from '../types';

/** 破冰五层 */
const ICEBREAKER_LAYERS = [
  { id: 1, label: '安全着陆', icon: '🌱', color: '#81C784' },
  { id: 2, label: '投射探测', icon: '🎨', color: '#64B5F6' },
  { id: 3, label: '情感标注', icon: '🔍', color: '#FFB74D' },
  { id: 4, label: '生活叙事', icon: '🧭', color: '#CE93D8' },
  { id: 5, label: '深度锚定', icon: '🌊', color: '#E57373' },
];

/** CBT 五阶段（FSM 状态映射） */
const CBT_STAGES: { id: FSMState; label: string; icon: string; color: string }[] = [
  { id: 'Active_Listening', label: FSM_STATE_META['Active_Listening'].label, icon: FSM_STATE_META['Active_Listening'].icon, color: FSM_STATE_META['Active_Listening'].colorHex },
  { id: 'CBT_Stripping', label: FSM_STATE_META['CBT_Stripping'].label, icon: FSM_STATE_META['CBT_Stripping'].icon, color: FSM_STATE_META['CBT_Stripping'].colorHex },
  { id: 'Socratic_Questioning', label: FSM_STATE_META['Socratic_Questioning'].label, icon: FSM_STATE_META['Socratic_Questioning'].icon, color: FSM_STATE_META['Socratic_Questioning'].colorHex },
  { id: 'Crisis_Escalation', label: FSM_STATE_META['Crisis_Escalation'].label, icon: FSM_STATE_META['Crisis_Escalation'].icon, color: FSM_STATE_META['Crisis_Escalation'].colorHex },
];

const FSM_ORDER: FSMState[] = ['Active_Listening', 'CBT_Stripping', 'Socratic_Questioning', 'Crisis_Escalation'];

export const StageIndicator: React.FC = () => {
  const fsmState = useChatStore(state => state.fsmState);
  const icebreakerLayer = useChatStore(state => state.icebreakerLayer);

  const isOnboarding = fsmState === 'Onboarding';

  return (
    <div className="flex flex-col gap-1.5 py-4 px-3">
      {/* 标题 */}
      <div className="text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">
        {isOnboarding ? '破冰进度' : 'CBT 阶段'}
      </div>

      {isOnboarding ? (
        /* ── 破冰层级 ── */
        ICEBREAKER_LAYERS.map((layer, idx) => {
          const isActive = layer.id === icebreakerLayer;
          const isCompleted = layer.id < icebreakerLayer;
          const isFuture = layer.id > icebreakerLayer;

          return (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300
                ${isActive ? 'bg-white/10 shadow-sm' : ''}
                ${isFuture ? 'opacity-40' : ''}
              `}
            >
              {/* 图标 */}
              <div
                className={`
                  w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0
                  transition-all duration-300
                  ${isActive ? 'scale-110' : ''}
                `}
                style={{
                  backgroundColor: isCompleted || isActive ? `${layer.color}22` : 'transparent',
                  boxShadow: isActive ? `0 0 12px ${layer.color}40` : 'none',
                }}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke={layer.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{layer.icon}</span>
                )}
              </div>

              {/* 文字 */}
              <span
                className={`
                  text-[13px] font-medium transition-colors duration-300
                  ${isActive ? 'text-on-surface' : isCompleted ? 'text-on-surface-variant' : 'text-on-surface-dim'}
                `}
              >
                {layer.label}
              </span>

              {/* 激活态小圆点 */}
              {isActive && (
                <motion.div
                  layoutId="stage-active-dot"
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: layer.color }}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </motion.div>
          );
        })
      ) : (
        /* ── CBT 阶段 ── */
        CBT_STAGES.map((stage, idx) => {
          const currentIdx = FSM_ORDER.indexOf(fsmState);
          const stageIdx = FSM_ORDER.indexOf(stage.id);
          const isActive = stage.id === fsmState;
          const isCompleted = stageIdx < currentIdx;
          const isFuture = stageIdx > currentIdx;

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3 }}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-300
                ${isActive ? 'bg-white/10 shadow-sm' : ''}
                ${isFuture ? 'opacity-40' : ''}
              `}
            >
              {/* 图标 */}
              <div
                className={`
                  w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0
                  transition-all duration-300
                  ${isActive ? 'scale-110' : ''}
                `}
                style={{
                  backgroundColor: isCompleted || isActive ? `${stage.color}22` : 'transparent',
                  boxShadow: isActive ? `0 0 12px ${stage.color}40` : 'none',
                }}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke={stage.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{stage.icon}</span>
                )}
              </div>

              {/* 文字 */}
              <span
                className={`
                  text-[13px] font-medium transition-colors duration-300
                  ${isActive ? 'text-on-surface' : isCompleted ? 'text-on-surface-variant' : 'text-on-surface-dim'}
                `}
              >
                {stage.label}
              </span>

              {/* 激活态小圆点 */}
              {isActive && (
                <motion.div
                  layoutId="stage-active-dot"
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </motion.div>
          );
        })
      )}
    </div>
  );
};
