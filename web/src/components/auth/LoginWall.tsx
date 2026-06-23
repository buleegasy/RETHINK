import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginModal } from './LoginModal';
import { DecryptText } from '../ui/DecryptText';
import { BlurText } from '../ui/BlurText';
import { AmbientGlow } from '../layout/AmbientGlow';


export function LoginWall() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-on-surface overflow-hidden selection:bg-gemini-blue/20 font-sans">
      <AmbientGlow forceShow={true} />
      {/* Extreme De-UI Aesthetics */}
      <AnimatePresence>
        {!isLoginModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(10px)', scale: 1.02 }}
            transition={{ duration: 1.2, ease: [0.19, 1.0, 0.22, 1.0] }}
            className="relative z-10 w-full h-full flex flex-col items-center justify-center pointer-events-none"
          >
            {/* Minimalist Museum-like Typography */}
            <motion.h1 
              initial={{ opacity: 0, y: 10, filter: 'blur(20px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 2, ease: "easeOut", delay: 0.2 }}
              className="font-serif text-4xl sm:text-5xl md:text-8xl tracking-[0.2em] font-light text-on-surface mb-6 drop-shadow-sm px-4 text-center"
              style={{ textShadow: '0 4px 24px rgba(255,255,255,0.4)' }}
            >
              <DecryptText text="RETHINK" delay={300} />
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 1.5 }}
              className="text-on-surface-variant/60 font-light tracking-widest text-xs md:text-sm uppercase mb-16 px-6 text-center leading-relaxed"
            >
              <BlurText text="探索内心 · 寻找平静" delay={1.5} />
            </motion.p>

            {/* Magnetic 'De-UI' Entry Orb with Floating Motion */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                repeat: Infinity,
                duration: 4,
                ease: "easeInOut"
              }}
              className="pointer-events-auto"
            >
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, delay: 2.5 }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsLoginModalOpen(true)}
                className="relative group flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full"
              >
                {/* Glass Orb background */}
                <div className="absolute inset-0 rounded-full bg-surface-container/20 backdrop-blur-md border border-outline-variant/30 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-700 group-hover:bg-surface-container/30 group-hover:border-outline/45 group-hover:shadow-[0_0_60px_rgba(255,255,255,0.6)]" />
                
                {/* Pulsing Core */}
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-amber-100/20 blur-xl" 
                />
                
                <span className="relative text-xs font-medium tracking-[0.2em] uppercase text-on-surface-variant hover:text-on-surface transition-colors">
                  进入
                </span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Header / Footer lines (extremely subtle) */}
      <AnimatePresence>
        {!isLoginModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              className="absolute top-6 left-6 right-6 md:top-8 md:left-8 md:right-8 flex justify-between items-center text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-on-surface-variant/40 font-medium z-10 pointer-events-none"
            >
              <span>展览 01</span>
              <span>内心空间</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 flex justify-center text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-on-surface-variant/30 font-medium z-10 pointer-events-none"
            >
              <span>© 2026 The Mind</span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modal with Parallax/Blur reveal */}
      <div className="relative z-50 pointer-events-auto">
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      </div>
    </div>
  );
}
