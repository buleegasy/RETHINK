import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VoiceOrb } from './VoiceOrb';
import { VoiceErrorBoundary } from './VoiceErrorBoundary';
import { useChatStore } from '../../store/chatStore';

interface VoiceDockProps {
  onDisconnect: () => void;
  onSwitchToText: () => void;
  status: 'idle' | 'connecting' | 'connected' | 'error';
}

// 极其平滑的阻尼曲线 (Cinematic Easing)
const SPRING_TRANSITION = { type: 'spring', damping: 25, stiffness: 120, mass: 0.5 };

export const VoiceDock: React.FC<VoiceDockProps> = ({ onDisconnect, onSwitchToText, status }) => {
  const { duplexPhase, fsmState } = useChatStore();

  const getStatusText = () => {
    if (status === 'connecting') return '正在建立安全连接...';
    if (status === 'error') return '连接受阻，尝试恢复中...';
    if (status === 'connected') {
      switch (duplexPhase) {
        case 'listening': return '正在倾听...';
        case 'thinking': return '思考中...';
        case 'speaking': return '正在表达...';
        default: return '已连接，请随时开口';
      }
    }
    return '准备就绪';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 150 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 150 }}
      transition={SPRING_TRANSITION}
      className="fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-center pb-12 z-50 pointer-events-none"
    >
      {/* Glassmorphism 2.0 Backdrop */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-3xl" style={{ maskImage: 'linear-gradient(to top, black 50%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 50%, transparent 100%)' }} />

      <div className="pointer-events-auto flex flex-col items-center relative z-10">
        {/* Orb container */}
        <div className="relative">
          <AnimatePresence mode="wait">
            {status === 'connecting' ? (
              <motion.div 
                key="skeleton"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_TRANSITION}
                className="w-48 h-48 rounded-full border border-white/20 animate-[spin_4s_linear_infinite] flex items-center justify-center backdrop-blur-md bg-white/5"
              >
                <div className="text-gray-400 text-xs font-light tracking-widest uppercase">Connecting</div>
              </motion.div>
            ) : (
              <motion.div
                key="orb"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={SPRING_TRANSITION}
              >
                <VoiceErrorBoundary onFallbackClick={onSwitchToText}>
                  <VoiceOrb />
                </VoiceErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div 
          layout
          transition={SPRING_TRANSITION}
          aria-live="polite"
          aria-atomic="true"
          className="text-gray-200 text-sm font-medium mt-8 tracking-wider drop-shadow-md backdrop-blur-xl px-5 py-2 rounded-full bg-white/5 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.1)]"
        >
          {getStatusText()}
        </motion.div>

        {/* Controls with Magnetic / Micro-interactions */}
        <motion.div layout transition={SPRING_TRANSITION} className="flex items-center gap-6 mt-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={onDisconnect}
            className="px-6 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-full font-medium shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-md border border-red-500/20 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            挂断
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            onClick={onSwitchToText}
            className="px-6 py-2.5 bg-gray-800/40 text-gray-300 hover:bg-gray-700/60 transition-colors rounded-full font-medium shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-md border border-white/10 relative overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            文字模式
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};
