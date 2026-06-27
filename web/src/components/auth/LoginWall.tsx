import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Key } from 'lucide-react';
import { LoginModal } from './LoginModal';
import { DecryptText } from '../ui/DecryptText';
import { BlurText } from '../ui/BlurText';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import type { AuthResponse } from '../../types';

export function LoginWall() {
  const login = useAuthStore(state => state.login);
  const sessionId = useChatStore(state => state.sessionId);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuestAccess = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const API_BASE = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${API_BASE}/api/auth/test-login`.replace(/\/api\/api\//g, '/api/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data: AuthResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || '测试账号登录失败');
        setLoading(false);
        return;
      }

      login(data.user, data.token);

      if (sessionId) {
        try {
          await fetch(`${API_BASE}/api/auth/bind-session`.replace(/\/api\/api\//g, '/api/'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({ sessionId })
          });
        } catch (bindErr) {
          console.warn('Failed to bind active session on guest access:', bindErr);
        }
      }
    } catch (err) {
      console.error('Guest access login error:', err);
      setError('网络连接失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-dim text-on-surface overflow-hidden selection:bg-gemini-blue/20 font-sans">
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
              className="text-on-surface-variant/80 font-light tracking-widest text-sm md:text-base uppercase mb-16 px-6 text-center leading-relaxed"
            >
              <BlurText text="AI 心理疏导智能体系统" delay={1.5} />
            </motion.p>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-error-container/80 border border-error/20 text-error text-xs tracking-wider px-4 py-2.5 rounded-2xl shadow-sm z-20 pointer-events-auto"
              >
                {error}
              </motion.div>
            )}
            
            {/* Control Group: Guest Access and Member Login */}
            <div className="flex flex-row items-center justify-center gap-10 md:gap-16 pointer-events-auto relative z-20">
              {/* Primary Guest Entry Orb */}
              <motion.div
                animate={{ y: loading ? 0 : [0, -6, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "easeInOut"
                }}
              >
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.5, delay: 2.2 }}
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  onClick={handleGuestAccess}
                  disabled={loading}
                  aria-label="访客体验"
                  title="访客体验"
                  className="relative group flex items-center justify-center w-36 h-36 md:w-48 md:h-48 rounded-full cursor-pointer"
                >
                  {/* Glass Orb background */}
                  <div className="absolute inset-0 rounded-full bg-surface-container/40 backdrop-blur-xl border border-outline-variant/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover:bg-surface-container/60 group-hover:border-outline/60 group-hover:shadow-[0_0_40px_rgba(66,133,244,0.3)]" />
                  
                  {/* Pulsing Core */}
                  <motion.div 
                    animate={{ 
                      opacity: loading ? [0.4, 0.8, 0.4] : [0.15, 0.4, 0.15], 
                      scale: loading ? [1, 1.2, 1] : [1, 1.15, 1] 
                    }}
                    transition={{ repeat: Infinity, duration: loading ? 1.5 : 3, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-gemini-blue/10 blur-xl group-hover:bg-gemini-blue/20 transition-colors duration-500" 
                  />

                  {/* Loading spinner overlay */}
                  {loading && (
                    <div className="absolute inset-2 rounded-full border-t border-l border-on-surface/40 animate-spin" />
                  )}
                  
                  <div className="relative flex flex-col items-center gap-3 text-on-surface-variant group-hover:text-on-surface transition-colors">
                    <User className={`w-8 h-8 md:w-10 md:h-10 stroke-[1.25] ${loading ? 'animate-pulse' : ''}`} />
                    <span className="text-sm md:text-base font-medium tracking-[0.25em] translate-x-[0.125em] opacity-80 group-hover:opacity-100 transition-opacity uppercase">
                      {loading ? '连接中' : '访客体验'}
                    </span>
                  </div>
                </motion.button>
              </motion.div>

              {/* Secondary Member Login Button */}
              <motion.div
                animate={{ y: loading ? 0 : [0, -6, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 4.5,
                  ease: "easeInOut"
                }}
              >
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.5, delay: 2.5 }}
                  whileHover={{ scale: loading ? 1 : 1.05 }}
                  whileTap={{ scale: loading ? 1 : 0.95 }}
                  onClick={() => setIsLoginModalOpen(true)}
                  disabled={loading}
                  aria-label="成员通道"
                  title="成员通道"
                  className="relative group flex items-center justify-center w-36 h-36 md:w-48 md:h-48 rounded-full cursor-pointer"
                >
                  {/* Glass Orb background */}
                  <div className="absolute inset-0 rounded-full bg-surface-container/40 backdrop-blur-xl border border-outline-variant/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-500 group-hover:bg-surface-container/60 group-hover:border-outline/60 group-hover:shadow-[0_0_40px_rgba(250,150,0,0.25)]" />
                  
                  {/* Pulsing Core */}
                  <motion.div 
                    animate={{ 
                      opacity: [0.15, 0.4, 0.15], 
                      scale: [1, 1.15, 1] 
                    }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-stage-orange/10 blur-xl group-hover:bg-stage-orange/20 transition-colors duration-500" 
                  />
                  
                  <div className="relative flex flex-col items-center gap-3 text-on-surface-variant group-hover:text-on-surface transition-colors">
                    <Key className="w-8 h-8 md:w-10 md:h-10 stroke-[1.25]" />
                    <span className="text-sm md:text-base font-medium tracking-[0.25em] translate-x-[0.125em] opacity-80 group-hover:opacity-100 transition-opacity uppercase">
                      成员登录
                    </span>
                  </div>
                </motion.button>
              </motion.div>
            </div>
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
              <span>智能系统 01</span>
              <span>心境空间</span>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}
              className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 flex justify-center text-[9px] md:text-[10px] tracking-[0.2em] uppercase text-on-surface-variant/30 font-medium z-10 pointer-events-none"
            >
              <span>© 2026 RETHINK 心理疏导智能体</span>
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
