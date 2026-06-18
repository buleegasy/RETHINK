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
        <div className="absolute inset-0 bg-amber-200/40 blur-3xl rounded-full animate-pulse-gentle" />
        
        {/* Inner dynamic Lotus Bloom */}
        <ReThinkLogo className="w-20 h-20 relative z-10" />
      </motion.div>

      {/* ── Gradient Greeting Text ── */}
      <motion.h1
        initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.15, duration: 1, ease: "easeOut" }}
        className="text-3xl md:text-4xl font-serif font-light tracking-[0.1em] text-slate-800 text-center px-4"
      >
        <span className="leading-tight pb-1">
          你好，欢迎来到这里
        </span>
      </motion.h1>
      
      {/* ── Sub-greeting (CBT context) ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="mt-6 text-slate-500 font-light tracking-wide text-sm md:text-base max-w-md text-center leading-relaxed"
      >
        在这里，你可以放心地说出任何感受。<br />
        <span className="text-slate-400/80 text-xs md:text-sm mt-2 block">点击下方，我会先问你几个简单的问题来了解你。</span>
      </motion.p>

      {/* ── Start Button ── */}
      {onStart && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
          onClick={onStart}
          className="mt-12 px-8 py-3.5 rounded-full bg-white/40 backdrop-blur-md border border-white/40 text-slate-800 font-light text-sm tracking-[0.2em] uppercase hover:bg-white/60 hover:scale-105 active:scale-95 transition-all duration-500 shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center gap-2.5 group"
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
