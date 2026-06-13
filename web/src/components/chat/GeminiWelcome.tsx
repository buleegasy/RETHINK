import { motion } from 'framer-motion';
import { ReThinkLogo } from '../layout/ReThinkLogo';

interface GeminiWelcomeProps {
  onStart?: () => void;
}

export function GeminiWelcome({ onStart }: GeminiWelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full select-none">
      {/* ── Bouncy Particle Logo ── */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 18,
          duration: 0.8
        }}
        className="relative flex items-center justify-center w-28 h-28 mb-8"
      >
        {/* Outer glowing aura */}
        <div className="absolute inset-0 bg-gemini-blue blur-3xl opacity-20 rounded-full animate-pulse-gentle" />
        
        {/* Inner dynamic Lotus Bloom */}
        <ReThinkLogo className="w-20 h-20 relative z-10" />
      </motion.div>

      {/* ── Gradient Greeting Text ── */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
        className="text-4xl md:text-5xl font-display font-medium text-center px-4"
      >
        <span className="gemini-gradient-text leading-tight pb-1">
          你好，欢迎来到这里
        </span>
      </motion.h1>
      
      {/* ── Sub-greeting (CBT context) ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-4 text-on-surface-variant text-lg font-sans max-w-md text-center"
      >
        在这里，你可以放心地说出任何感受。<br />
        <span className="text-on-surface-variant/60 text-base">点击下方，我会先问你几个简单的问题来了解你。</span>
      </motion.p>

      {/* ── Start Button ── */}
      {onStart && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5, ease: "easeOut" }}
          onClick={onStart}
          className="mt-10 px-8 py-3.5 rounded-full bg-on-surface text-surface font-medium text-[16px] tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2.5 group"
        >
          <span>开始对话</span>
          <svg className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </motion.button>
      )}
    </div>
  );
}
