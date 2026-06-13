import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';

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
          style={{ mixBlendMode: 'normal' }}
        >
          {/* Cloud 1: Deep Sky Blue */}
          <motion.div
            className="absolute top-[-10%] left-[5%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(66, 133, 244, 0.45) 0%, rgba(66, 133, 244, 0) 70%)',
              filter: 'blur(70px)',
            }}
            animate={{
              x: [0, 150, -100, 0],
              y: [0, -80, 100, 0],
              scale: [1, 1.3, 0.8, 1],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Cloud 2: Mint Cyan (Replaced Purple) */}
          <motion.div
            className="absolute top-[5%] right-[0%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0, 188, 212, 0.35) 0%, rgba(0, 188, 212, 0) 70%)',
              filter: 'blur(70px)',
            }}
            animate={{
              x: [0, -120, 90, 0],
              y: [0, 100, -80, 0],
              scale: [1, 0.8, 1.25, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />

          {/* Cloud 3: Coral Peach */}
          <motion.div
            className="absolute top-[15%] left-[25%] w-[65vw] h-[65vw] max-w-[900px] max-h-[900px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(234, 67, 53, 0.25) 0%, rgba(234, 67, 53, 0) 70%)',
              filter: 'blur(90px)',
            }}
            animate={{
              x: [0, 100, -130, 0],
              y: [0, -90, 110, 0],
              scale: [1, 1.2, 0.85, 1],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
