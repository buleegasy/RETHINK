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
          className="fixed inset-0 top-0 left-0 w-full h-[60vh] pointer-events-none z-0 overflow-hidden"
          style={{ mixBlendMode: 'normal' }}
        >
          {/* Cloud 1: Sky Blue */}
          <motion.div
            className="absolute top-[-10%] left-[10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(210, 227, 252, 0.5) 0%, rgba(210, 227, 252, 0) 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              x: [0, 50, -30, 0],
              y: [0, -30, 40, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Cloud 2: Soft Lavender */}
          <motion.div
            className="absolute top-[5%] right-[5%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(232, 216, 250, 0.5) 0%, rgba(232, 216, 250, 0) 70%)',
              filter: 'blur(60px)',
            }}
            animate={{
              x: [0, -40, 20, 0],
              y: [0, 40, -20, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />

          {/* Cloud 3: Warm Peach/Pearl */}
          <motion.div
            className="absolute top-[20%] left-[30%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 240, 245, 0.5) 0%, rgba(255, 240, 245, 0) 70%)',
              filter: 'blur(80px)',
            }}
            animate={{
              x: [0, 30, -50, 0],
              y: [0, -20, 30, 0],
              scale: [1, 1.05, 0.98, 1],
            }}
            transition={{
              duration: 14,
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
