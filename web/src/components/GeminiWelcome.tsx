import { motion } from 'framer-motion';

export function GeminiWelcome() {
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
        
        {/* Inner dynamic gradient sparkle */}
        <svg 
          viewBox="0 0 28 28" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-16 h-16 relative z-10 gemini-sparkle-icon rounded-full p-2"
        >
          <path d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z" fill="white"/>
        </svg>
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
        在这里，你可以放心地说出任何感受。我会认真听。
      </motion.p>
    </div>
  );
}
