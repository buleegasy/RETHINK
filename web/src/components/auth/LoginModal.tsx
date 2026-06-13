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
    const url = isSignUp ? `${API_BASE}/api/auth/register` : `${API_BASE}/api/auth/login`;
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
          await fetch(`${API_BASE}/api/auth/bind-session`, {
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
      const res = await fetch(`${API_BASE}/api/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          await fetch(`${API_BASE}/api/auth/bind-session`, {
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
            className="relative w-full max-w-md md:max-w-4xl bg-white/40 border border-white/60 backdrop-blur-3xl rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left side: Branding / Graphic (Hidden on mobile) */}
            <div className="hidden md:flex flex-col justify-between w-1/2 p-10 lg:p-14 relative bg-black/5">
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-80 mix-blend-overlay" />
              <div className="relative z-10">
                <h2 className="text-4xl font-serif text-slate-800 mb-6 leading-[1.3] tracking-wider drop-shadow-sm">
                  Reconnect<br />with your<br /><span className="text-slate-900 font-medium">Inner Self</span>
                </h2>
                <p className="text-slate-600/80 text-sm leading-relaxed max-w-[280px] font-light tracking-wide">
                  A sanctuary designed without borders. Step into a space of complete psychological safety and let your thoughts flow naturally.
                </p>
              </div>
              <div className="relative z-10 text-[10px] tracking-widest uppercase text-slate-500/60 font-medium">
                © 2026 Interactive Art Installation
              </div>
            </div>

            {/* Right side: Form */}
            <div className="w-full md:w-1/2 p-8 md:p-10 lg:p-12 relative flex flex-col justify-center">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="md:hidden flex flex-col items-center mb-10">
                <h2 className="text-2xl font-serif text-slate-800 tracking-wider">
                  Sanctuary
                </h2>
              </div>

              <div className="flex bg-white/20 rounded-full p-1 border border-white/40 mb-8 relative z-10 backdrop-blur-md shadow-inner">
                <button
                  type="button"
                  className={`flex-1 text-center py-2.5 text-xs tracking-widest uppercase font-medium rounded-full transition-all duration-500 ${
                    !isSignUp ? 'bg-white/70 shadow-sm text-slate-900 border border-white/50' : 'text-slate-600/70 hover:text-slate-900 hover:bg-white/30'
                  }`}
                  onClick={() => { setIsSignUp(false); setError(null); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`flex-1 text-center py-2.5 text-xs tracking-widest uppercase font-medium rounded-full transition-all duration-500 ${
                    isSignUp ? 'bg-white/70 shadow-sm text-slate-900 border border-white/50' : 'text-slate-600/70 hover:text-slate-900 hover:bg-white/30'
                  }`}
                  onClick={() => { setIsSignUp(true); setError(null); }}
                >
                  Enter Code
                </button>
              </div>

              {error && (
                <div className="mb-5 bg-red-50 border border-red-100 text-red-600 text-[13px] px-4 py-3 rounded-2xl flex items-start gap-2.5 animate-slide-up shadow-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/30 focus:bg-white/60 border-b border-white/50 focus:border-slate-800/40 text-slate-900 placeholder-slate-500/60 text-sm py-4 px-2 outline-none transition-all duration-500 shadow-none rounded-none font-light tracking-wide"
                  />
                </div>

                <div>
                  <input
                    type="password"
                    required
                    disabled={loading}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/30 focus:bg-white/60 border-b border-white/50 focus:border-slate-800/40 text-slate-900 placeholder-slate-500/60 text-sm py-4 px-2 outline-none transition-all duration-500 shadow-none rounded-none font-light tracking-wide"
                  />
                </div>

                {isSignUp && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <input
                      type="text"
                      required
                      disabled={loading}
                      placeholder="Invitation Key"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="w-full bg-white/30 focus:bg-white/60 border-b border-white/50 focus:border-slate-800/40 text-slate-900 placeholder-slate-500/60 text-sm py-4 px-2 outline-none transition-all duration-500 shadow-none rounded-none font-light tracking-wide"
                    />
                  </motion.div>
                )}

                <div className="flex justify-center py-2">
                  <div id="turnstile-container-modal" className="relative overflow-hidden min-h-[65px] flex items-center justify-center opacity-80 mix-blend-multiply filter grayscale"></div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-slate-900/90 hover:bg-slate-900 text-white font-light tracking-widest text-xs uppercase py-5 rounded-full transition-all duration-700 disabled:opacity-40 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                  {loading ? (
                    <span className="animate-pulse">Authenticating...</span>
                  ) : (
                    <span>{isSignUp ? 'Materialize' : 'Enter Sanctuary'}</span>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={handleTestLogin}
                  disabled={loading}
                  className="text-[11px] tracking-widest uppercase text-slate-600/60 hover:text-slate-900 transition-colors font-medium relative group"
                >
                  <span className="relative z-10">Guest Access</span>
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-slate-900/40 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
