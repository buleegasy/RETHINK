import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { MiniaturePicker } from './MiniaturePicker';

const SandplayCanvas = React.lazy(() => import('./SandplayCanvas').then(m => ({ default: m.SandplayCanvas })));

export const SandplayPanel: React.FC = () => {
  const { isSandplayOpen, sandplayState, closeSandplay, updateSandplayState } = useChatStore();

  return (
    <AnimatePresence>
      {isSandplayOpen && sandplayState && (
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          className="flex flex-col w-full md:w-[400px] h-[70vh] md:h-full bg-surface-dim/80 backdrop-blur-2xl md:border-l border-t md:border-t-0 border-outline-variant/30 shrink-0 shadow-2xl relative z-40 md:relative fixed bottom-0 left-0 right-0 md:rounded-none rounded-t-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low/50">
            <h2 className="text-lg font-semibold text-on-surface flex items-center gap-2">
              <span>🎨</span> 心灵沙盘
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={closeSandplay}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 p-4 relative min-h-[300px]">
            <Suspense fallback={
              <div role="status" aria-label="加载沙盘画布中..." className="flex flex-col items-center justify-center h-full min-h-[250px] text-on-surface-variant gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-gemini-blue" />
                <span className="text-xs">加载沙盘画布...</span>
              </div>
            }>
              <SandplayCanvas 
                state={sandplayState} 
                onChange={updateSandplayState} 
              />
            </Suspense>
          </div>

          {/* Picker Area */}
          <MiniaturePicker 
            state={sandplayState} 
            onChange={updateSandplayState} 
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
