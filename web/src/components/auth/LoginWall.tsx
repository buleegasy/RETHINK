import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginModal } from './LoginModal';
import { ArtMeshBackground } from '../layout/ArtMeshBackground';

export function LoginWall() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-slate-800 overflow-hidden selection:bg-amber-500/20 font-sans">
      
      {/* The Breathing WebGL Art Installation */}
      <ArtMeshBackground />

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
              className="font-serif text-6xl md:text-8xl tracking-[0.2em] font-light text-slate-800/90 mb-6 drop-shadow-sm"
              style={{ textShadow: '0 4px 24px rgba(255,255,255,0.4)' }}
            >
              RETHINK
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 1.5 }}
              className="text-slate-600/60 font-light tracking-widest text-sm uppercase mb-16"
            >
              Interactive digital art & psychological safety
            </motion.p>

            {/* Magnetic 'De-UI' Entry Orb */}
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, delay: 2.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLoginModalOpen(true)}
              className="pointer-events-auto relative group flex items-center justify-center w-24 h-24 rounded-full"
            >
              {/* Glass Orb background */}
              <div className="absolute inset-0 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all duration-700 group-hover:bg-white/20 group-hover:shadow-[0_0_60px_rgba(255,255,255,0.6)]" />
              
              {/* Pulsing Core */}
              <div className="absolute inset-0 rounded-full bg-amber-100/20 blur-xl animate-pulse" />
              
              <span className="relative text-xs font-medium tracking-[0.2em] uppercase text-slate-700/80 group-hover:text-slate-900 transition-colors">
                Enter
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Header / Footer lines (extremely subtle) */}
      <AnimatePresence>
        {!isLoginModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              className="absolute top-8 left-8 right-8 flex justify-between items-center text-[10px] tracking-[0.3em] uppercase text-slate-800/40 font-medium z-10 pointer-events-none"
            >
              <span>Exhibition 01</span>
              <span>Sanctuary</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              className="absolute bottom-8 left-8 right-8 flex justify-center text-[10px] tracking-[0.2em] uppercase text-slate-800/30 font-medium z-10 pointer-events-none"
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
