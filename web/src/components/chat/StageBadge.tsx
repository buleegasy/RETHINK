import React from 'react';
import type { FC } from 'react';
import type { CBTStage, FSMState } from '../../types';
import { FSM_STATE_META } from '../../types';

interface StageBadgeProps {
  stage?: CBTStage;
  fsmState?: FSMState;
}

export const StageBadge: FC<StageBadgeProps> = ({ stage, fsmState }) => {
  const label = fsmState
    ? FSM_STATE_META[fsmState]?.label ?? fsmState
    : stage || '剥离事实';

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gemini-purple/10 text-gemini-purple border border-gemini-purple/20 select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-gemini-purple animate-pulse-gentle" />
      {label}
    </span>
  );
};
