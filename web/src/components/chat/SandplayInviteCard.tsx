import React from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';

export const SandplayInviteCard: FC = () => {
  const setSandplayInvitePending = useChatStore((state) => state.setSandplayInvitePending);
  const openSandplay = useChatStore((state) => state.openSandplay);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-6 flex flex-col items-center gap-4 bg-surface-container-low/50 p-6 rounded-3xl border border-primary/20 max-w-sm mx-auto shadow-sm"
    >
      <div className="text-4xl drop-shadow-md">🎨</div>
      <div className="text-sm text-center text-on-surface-variant font-light">
        也许文字难以准确描述此刻的感受，<br />想要试着用沙盘把它们具象化吗？
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSandplayInvitePending(false)}
          className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          不用了
        </button>
        <button
          type="button"
          onClick={openSandplay}
          className="px-6 py-2 rounded-full text-xs font-medium text-on-primary bg-primary hover:opacity-90 transition-opacity shadow-md cursor-pointer"
        >
          打开心灵沙盘
        </button>
      </div>
    </motion.div>
  );
};
