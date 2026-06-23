import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { X } from 'lucide-react';
import type { AuthResponse } from '../../types';

declare global {
  interface Window {
    turnstile?: any;
  }
}



interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const login = useAuthStore(state => state.login);
  const sessionId = useChatStore(state => state.sessionId);

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    
    const initTurnstile = () => {
      if (!active || !isOpen) return;
      if (window.turnstile) {
        try {
          const container = document.getElementById('turnstile-container-modal');
          if (container) {
            container.innerHTML = '';
            setTurnstileToken(null);
            window.turnstile.render('#turnstile-container-modal', {
              sitekey: '0x4AAAAAADgdD3JygbJ4oXZi',
              callback: (token: string) => {
                setTurnstileToken(token);
              },
              'error-callback': () => {
                console.error('Turnstile widget failed to render.');
              }
            });
          }
        } catch (e) {
          console.warn('Turnstile rendering deferred', e);
        }
      }
    };

    if (isOpen) {
      if (!window.turnstile) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        script.onload = initTurnstile;
      } else {
        setTimeout(initTurnstile, 50);
      }
    }

    return () => {
      active = false;
    };
  }, [isOpen, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    if (isSignUp && !invitationCode.trim()) {
      setError('请输入内测邀请密钥');
      return;
    }

    if (!turnstileToken) {
      setError('请完成人机安全校验');
      return;
    }

    setLoading(true);
    setError(null);

    const API_BASE = import.meta.env.VITE_API_URL || '';
    const url = (isSignUp ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`).replace(/\/api\/api\//g, '/api/');
    const payload = isSignUp
      ? { username: username.trim(), password, invitationCode: invitationCode.trim(), turnstileToken }
      : { username: username.trim(), password, turnstileToken };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data: AuthResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || '身份验证失败');
        setLoading(false);
        if (window.turnstile) window.turnstile.reset('#turnstile-container-modal');
        setTurnstileToken(null);
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
          console.warn('Failed to bind active session on login:', bindErr);
        }
      }
    } catch (err: any) {
      console.error('Submit auth error:', err);
      setError('网络请求失败，请检查连接');
      if (window.turnstile) window.turnstile.reset('#turnstile-container-modal');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
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
          console.warn('Failed to bind active session on test login:', bindErr);
        }
      }
    } catch (err: any) {
      console.error('Test login error:', err);
      setError('网络请求失败，请检查连接');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
            transition={{ duration: 1.2, ease: [0.19, 1.0, 0.22, 1.0] }}
            className="relative w-full max-w-[calc(100vw-2rem)] md:max-w-4xl bg-surface-dim/60 border border-outline-variant/30 backdrop-blur-3xl rounded-[32px] md:rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row max-h-[85dvh] overflow-y-auto"
          >
            {/* Left side: Branding / Graphic (Hidden on mobile) */}
            <div className="hidden md:flex flex-col justify-between w-1/2 p-10 lg:p-14 relative bg-surface-container/20">
              <div className="absolute inset-0 bg-gradient-to-br from-surface/60 to-transparent opacity-80 mix-blend-overlay" />
              <div className="relative z-10">
                <h2 className="text-4xl font-serif text-on-surface mb-6 leading-[1.3] tracking-wider drop-shadow-sm">
                  重新连接<br />你的<br /><span className="text-on-surface font-medium">内心</span>
                </h2>
                <p className="text-on-surface-variant/80 text-sm leading-relaxed max-w-[280px] font-light tracking-wide">
                  一个专为你设计的安全空间。放下戒备，让思绪自然流动。
                </p>
              </div>
              <div className="relative z-10 text-[10px] tracking-widest uppercase text-on-surface-variant/60 font-medium">
                © 2026 心理交互艺术装置
              </div>
            </div>

            {/* Right side: Form with optimized responsive padding */}
            <div className="w-full md:w-1/2 p-4 sm:p-8 md:p-10 lg:p-12 relative flex flex-col justify-center">
              <motion.button
                onClick={onClose}
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container rounded-full transition-colors z-20 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <div className="md:hidden flex flex-col items-center mb-6 md:mb-10">
                <h2 className="text-2xl font-serif text-on-surface tracking-wider">
                  RE-THINK
                </h2>
              </div>

              <div className="flex bg-surface-container/30 rounded-full p-1 border border-outline-variant/30 mb-5 md:mb-8 relative z-10 backdrop-blur-md shadow-inner-soft">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className={`flex-1 text-center py-2.5 text-xs tracking-widest uppercase font-medium rounded-full transition-all duration-500 cursor-pointer ${
                    !isSignUp ? 'bg-surface/80 shadow-sm text-on-surface border border-outline-variant/30' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                  }`}
                  onClick={() => { setIsSignUp(false); setError(null); }}
                >
                  登录
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className={`flex-1 text-center py-2.5 text-xs tracking-widest uppercase font-medium rounded-full transition-all duration-500 cursor-pointer ${
                    isSignUp ? 'bg-surface/80 shadow-sm text-on-surface border border-outline-variant/30' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/40'
                  }`}
                  onClick={() => { setIsSignUp(true); setError(null); }}
                >
                  注册
                </motion.button>
              </div>

              {error && (
                <div className="mb-5 bg-error-container/80 border border-error/20 text-error text-[13px] px-4 py-3 rounded-2xl flex items-start gap-2.5 animate-slide-up shadow-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    placeholder="用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-surface-container/20 focus:bg-surface-container/50 border-b border-outline-variant/50 focus:border-gemini-blue/60 text-on-surface placeholder-on-surface-dim text-[16px] md:text-sm py-3 md:py-4 px-2 outline-none transition-all duration-500 shadow-none rounded-none appearance-none font-light tracking-wide"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    disabled={loading}
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container/20 focus:bg-surface-container/50 border-b border-outline-variant/50 focus:border-gemini-blue/60 text-on-surface placeholder-on-surface-dim text-[16px] md:text-sm py-3 md:py-4 px-2 outline-none transition-all duration-500 shadow-none rounded-none appearance-none font-light tracking-wide"
                  />
                </div>

                {isSignUp && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <input
                      type="text"
                      required
                      disabled={loading}
                      placeholder="邀请密钥"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="w-full bg-surface-container/20 focus:bg-surface-container/50 border-b border-outline-variant/50 focus:border-gemini-blue/60 text-on-surface placeholder-on-surface-dim text-[16px] md:text-sm py-3 md:py-4 px-2 outline-none transition-all duration-500 shadow-none rounded-none appearance-none font-light tracking-wide"
                    />
                  </motion.div>
                )}

                <div className="flex justify-center py-2">
                  <div id="turnstile-container-modal" className="relative overflow-hidden min-h-[65px] flex items-center justify-center opacity-80 mix-blend-multiply filter grayscale"></div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-on-surface hover:bg-on-surface/90 text-surface font-light tracking-widest text-xs uppercase py-4 md:py-5 rounded-full transition-all duration-700 disabled:opacity-40 overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                  {loading ? (
                    <span className="animate-pulse">验证中...</span>
                  ) : (
                    <span>{isSignUp ? '完成注册' : '登录'}</span>
                  )}
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  type="button"
                  onClick={handleTestLogin}
                  disabled={loading}
                  className="text-[11px] tracking-widest uppercase text-on-surface-variant/80 hover:text-on-surface transition-colors font-medium relative group cursor-pointer"
                >
                  <span className="relative z-10">访客体验</span>
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-on-surface/40 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
