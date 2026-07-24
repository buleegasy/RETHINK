import React from 'react';
import type { FC } from 'react';
import { ModelSelector } from './ModelSelector';
import { StageBadge } from './StageBadge';
import { useChatStore } from '../../store/chatStore';

export const WelcomeBanner: FC = () => {
  const currentStage = useChatStore((state) => state.currentStage);

  return (
    <div className="w-full flex items-center justify-between px-2 py-2 mb-2 border-b border-outline-variant/15 text-xs text-on-surface-variant">
      <div className="flex items-center gap-2">
        <span className="font-sans font-medium text-on-surface">RE-THINK</span>
        <span className="text-on-surface-variant/40">|</span>
        <StageBadge stage={currentStage} />
      </div>
      <ModelSelector />
    </div>
  );
};
