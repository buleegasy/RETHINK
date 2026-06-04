import React from 'react';
import { CBT_STAGES } from '../types';
import type { CBTStage } from '../types';
import { useChatStore } from '../store/chatStore';

/** CBT stage metadata for the sidebar */
const CBT_STAGE_META: Record<CBTStage, {
  icon: string;
  description: string;
  completedBg: string;
  completedText: string;
}> = {
  '剥离事实': { icon: '🔍', description: '区分事实与感受', completedBg: 'bg-stage-blue/10', completedText: 'text-stage-blue' },
  '捕获想法': { icon: '💭', description: '识别自动化思维', completedBg: 'bg-stage-green/10', completedText: 'text-stage-green' },
  '扫描漏洞': { icon: '🧩', description: '发现认知偏差', completedBg: 'bg-stage-orange/10', completedText: 'text-stage-orange' },
  '证据质询': { icon: '⚖️', description: '挑战不合理信念', completedBg: 'bg-stage-red/10', completedText: 'text-stage-red' },
  '重构认知': { icon: '✨', description: '建立新的视角', completedBg: 'bg-stage-purple/10', completedText: 'text-stage-purple' },
};


/** Checkmark icon for completed stages */
const CheckIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Shield icon for safety section */
const ShieldIcon = () => (
  <svg className="w-5 h-5 text-gemini-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/** Phone icon for crisis section */
const PhoneIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

export const StageIndicator: React.FC = () => {
  const fsmState = useChatStore(state => state.fsmState);
  const currentStage = useChatStore(state => state.currentStage);
  const currentIdx = CBT_STAGES.indexOf(currentStage);
  const isCrisis = fsmState === 'Crisis_Escalation';

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col h-full z-20 bg-surface border-r border-outline-variant/50">
      {/* ── Header ── */}
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-2.5">
          <svg className="w-7 h-7 animate-sparkle" viewBox="0 0 28 28" fill="none">
            <path d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z" fill="url(#sg)" />
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4285F4" />
                <stop offset="0.5" stopColor="#A142F4" />
                <stop offset="1" stopColor="#4285F4" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h1 className="font-display font-semibold text-on-surface text-lg leading-tight">
              RE-THINK
            </h1>
            <p className="text-on-surface-variant text-sm leading-tight mt-0.5">
              认知行为疗法
            </p>
          </div>
        </div>
      </div>

      {/* ── CBT Stage List (NavigationRail style) ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col">
          {CBT_STAGES.map((stage, idx) => {
            const meta = CBT_STAGE_META[stage];
            const isActive = idx === currentIdx;
            const isPast = idx < currentIdx;
            const isLast = idx === CBT_STAGES.length - 1;

            return (
              <div key={stage} className="relative">
                {/* Vertical connector line */}
                {!isLast && (
                  <div
                    className={`absolute left-[19px] top-[40px] bottom-0 border-l-2 ${
                      isPast ? 'border-outline-variant' : 'border-outline-variant/40'
                    }`}
                  />
                )}

                {/* Stage row */}
                <div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-md3-standard ${
                    isActive ? 'bg-gemini-blue-surface' : ''
                  }`}
                >
                  {/* Icon circle */}
                  <div className="relative z-10 flex items-center justify-center w-[26px] h-[26px] shrink-0">
                    {isPast ? (
                      /* Completed: colored circle with check */
                      <div className={`w-[26px] h-[26px] rounded-full ${meta.completedBg} ${meta.completedText} flex items-center justify-center`}>
                        <CheckIcon />
                      </div>
                    ) : isActive ? (
                      /* Current: blue dot with pulse */
                      <div className="relative w-[26px] h-[26px] flex items-center justify-center">
                        <div className="absolute w-[26px] h-[26px] rounded-full bg-gemini-blue/15 animate-ping-slow" />
                        <div className="relative w-3 h-3 rounded-full bg-gemini-blue" />
                      </div>
                    ) : (
                      /* Future: gray circle with number */
                      <div className="w-[26px] h-[26px] rounded-full bg-surface-container flex items-center justify-center">
                        <span className="text-xs font-medium text-on-surface-dim">{idx + 1}</span>
                      </div>
                    )}
                  </div>

                  {/* Label + description */}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] leading-tight flex items-center gap-1.5 transition-colors duration-300 ${
                        isActive
                          ? 'text-gemini-blue font-medium'
                          : isPast
                          ? 'text-on-surface'
                          : 'text-on-surface-dim'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span>{stage}</span>
                    </div>
                    {isActive && (
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed animate-fade-in">
                        {meta.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Safety Section ── */}
      <div className="px-4 pb-5 pt-3">
        {isCrisis ? (
          /* Crisis mode: red alert card */
          <div className="bg-error-container rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <PhoneIcon className="w-5 h-5 text-error" />
              <p className="text-sm font-medium text-error">
                请立即拨打 12355
              </p>
            </div>
            <p className="text-xs text-error/70 mb-3 leading-relaxed">
              如果你正处于危险中，请立即联系专业帮助
            </p>
            <a
              href="tel:12355"
              className="flex items-center justify-center gap-2 bg-error text-white hover:bg-error/90 transition-colors duration-200 ease-md3-standard rounded-xl py-2.5 font-medium text-sm"
            >
              <PhoneIcon className="w-4 h-4 text-white" />
              <span>拨打 12355</span>
            </a>
          </div>
        ) : (
          /* Normal mode: soft blue safety card */
          <div className="bg-gemini-blue-surface rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <ShieldIcon />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  如遇紧急情况请拨打
                </p>
                <a
                  href="tel:12355"
                  className="text-sm font-medium text-gemini-blue hover:underline transition-colors duration-200"
                >
                  12355
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
