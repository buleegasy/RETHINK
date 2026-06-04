import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../store/chatStore';

export const AmbientGlow: React.FC = () => {
  const isStreaming = useChatStore(state => state.isStreaming);

  return (
    <AnimatePresence>
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.5 } }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="fixed inset-0 top-0 left-0 w-full h-full pointer-events-none z-0"
          style={{ mixBlendMode: 'screen' }}
        >
          {/* Cloud 1: Pure Sky Blue */}
          <motion.div
            className="absolute top-[-10%] left-[5%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(166, 200, 255, 0.35) 0%, rgba(166, 200, 255, 0) 70%)',
              filter: 'blur(80px)',
            }}
            animate={{
              x: [0, 60, -40, 0],
              y: [0, -40, 50, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Cloud 2: Clean Lavender */}
          <motion.div
            className="absolute top-[5%] right-[0%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(215, 174, 251, 0.3) 0%, rgba(215, 174, 251, 0) 70%)',
              filter: 'blur(80px)',
            }}
            animate={{
              x: [0, -50, 30, 0],
              y: [0, 50, -30, 0],
              scale: [1, 0.85, 1.1, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />

          {/* Cloud 3: Soft Peach */}
          <motion.div
            className="absolute top-[15%] left-[25%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 232, 214, 0.25) 0%, rgba(255, 232, 214, 0) 70%)',
              filter: 'blur(100px)',
            }}
            animate={{
              x: [0, 40, -60, 0],
              y: [0, -30, 40, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
