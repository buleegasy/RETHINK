import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';

export const VoiceOrb: React.FC = () => {
  // ⚡ Bolt Optimization: Use targeted selectors instead of destructuring
  // Subscribing to specific properties instead of the whole store prevents
  // severe re-rendering bottlenecks during text streaming updates
  const duplexPhase = useChatStore(state => state.duplexPhase);
  const audioLevel = useChatStore(state => state.audioLevel);
  const fsmState = useChatStore(state => state.fsmState);

  // Premium Luminous Clarity Palette mapped to FSM
  const colorMap = useMemo(() => {
    switch (fsmState) {
      case 'Onboarding': return { primary: '#e0e7ff', secondary: '#818cf8', rgb: '129, 140, 248' }; // Soft Indigo
      case 'Active_Listening': return { primary: '#d1fae5', secondary: '#34d399', rgb: '52, 211, 153' }; // Soft Emerald
      case 'CBT_Stripping': return { primary: '#dbeafe', secondary: '#60a5fa', rgb: '96, 165, 250' }; // Soft Blue
      case 'Socratic_Questioning': return { primary: '#ede9fe', secondary: '#a78bfa', rgb: '167, 139, 250' }; // Soft Violet
      case 'Crisis_Escalation': return { primary: '#fee2e2', secondary: '#f87171', rgb: '248, 113, 113' }; // Soft Red
      default: return { primary: '#f3f4f6', secondary: '#9ca3af', rgb: '156, 163, 175' }; // Soft Gray
    }
  }, [fsmState]);

  // Audio driven scale
  const baseScale = duplexPhase === 'idle' ? 1 : 1 + (audioLevel * 1.8);
  const isThinking = duplexPhase === 'thinking';

  return (
    <div className="relative w-64 h-64 flex items-center justify-center overflow-visible">
      
      {/* SVG Gooey Filter Definition */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Ambient background glow using ultra-soft blur */}
      <motion.div
        className="absolute w-32 h-32 rounded-full pointer-events-none"
        animate={{
          scale: isThinking ? [1, 1.2, 1] : baseScale * 1.5,
          opacity: isThinking ? [0.4, 0.7, 0.4] : 0.6,
        }}
        transition={{
          scale: { duration: 0.15, ease: 'easeOut' },
          opacity: { duration: isThinking ? 1.5 : 2, repeat: Infinity, ease: 'easeInOut' }
        }}
        style={{
          background: `radial-gradient(circle, rgba(${colorMap.rgb}, 0.6) 0%, rgba(${colorMap.rgb}, 0) 70%)`,
          filter: 'blur(30px)'
        }}
      />

      {/* Gooey Container */}
      <motion.div 
        className="relative w-32 h-32 flex items-center justify-center pointer-events-none"
        style={{ filter: 'url(#goo)' }}
        animate={{ scale: baseScale }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Core Blob */}
        <motion.div
          className="absolute w-20 h-20 rounded-full"
          animate={{
            rotate: 360,
            scale: isThinking ? [1, 0.9, 1] : 1
          }}
          transition={{
            rotate: { duration: 15, repeat: Infinity, ease: 'linear' },
            scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
          }}
          style={{ background: `linear-gradient(135deg, ${colorMap.primary}, ${colorMap.secondary})` }}
        />

        {/* Orbiting Blobs for Gooey adhesion */}
        <motion.div
          className="absolute w-12 h-12 rounded-full"
          animate={{
            rotate: -360,
            x: [15, -15, 15],
            y: [-15, 15, -15],
          }}
          transition={{
            rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
            x: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }}
          style={{ background: colorMap.secondary, opacity: 0.9 }}
        />

        <motion.div
          className="absolute w-14 h-14 rounded-full"
          animate={{
            rotate: 360,
            x: [-20, 20, -20],
            y: [10, -20, 10],
          }}
          transition={{
            rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
            x: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
          }}
          style={{ background: colorMap.primary, opacity: 0.8 }}
        />
      </motion.div>
    </div>
  );
};
