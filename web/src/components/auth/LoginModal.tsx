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

const LoginSparkle = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z" fill="url(#login-grad-light)"/>
    <defs>
      <linearGradient id="login-grad-light" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F97316"/> {/* Orange 500 */}
        <stop offset="1" stopColor="#F59E0B"/> {/* Amber 500 */}
      </linearGradient>
    </defs>
  </svg>
);

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
            className="relative w-full max-w-md md:max-w-4xl bg-white/80 border border-white backdrop-blur-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row"
          >
            {/* Left side: Branding / Graphic (Hidden on mobile) */}
            <div className="hidden md:flex flex-col justify-between w-1/2 p-10 lg:p-12 bg-gradient-to-br from-orange-50 to-amber-50 border-r border-orange-100/50 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent opacity-80" />
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm mb-8">
                  <LoginSparkle className="w-8 h-8" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-semibold text-slate-800 mb-4 leading-[1.3] tracking-tight">
                  重新连接<br />你的<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">内在力量</span>
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[280px]">
                  在这个温暖、无评判的空间里，整理思绪，重获内心的平静与从容。
                </p>
              </div>
              <div className="relative z-10 text-xs text-slate-400">
                © 2026 RETHINK.
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

              <div className="md:hidden flex flex-col items-center mb-8">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-orange-100 shadow-sm mb-4">
                  <LoginSparkle className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-800 text-center">
                  欢迎回来
                </h2>
              </div>

              <div className="flex bg-slate-100/50 rounded-full p-1.5 border border-slate-200/50 mb-6 relative z-10">
                <button
                  type="button"
                  className={`flex-1 text-center py-2 text-[14px] font-medium rounded-full transition-all duration-300 ${
                    !isSignUp ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => { setIsSignUp(false); setError(null); }}
                >
                  登录已有账号
                </button>
                <button
                  type="button"
                  className={`flex-1 text-center py-2 text-[14px] font-medium rounded-full transition-all duration-300 ${
                    isSignUp ? 'bg-white shadow-sm text-slate-800 border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => { setIsSignUp(true); setError(null); }}
                >
                  新用户注册
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5 pl-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    placeholder="请输入内测用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-400/50 text-slate-800 placeholder-slate-400 text-sm rounded-2xl py-3.5 px-4 outline-none transition-all duration-200 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-1.5 pl-1">
                    密码
                  </label>
                  <input
                    type="password"
                    required
                    disabled={loading}
                    placeholder="请输入密码（最少 6 位）"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-400/50 text-slate-800 placeholder-slate-400 text-sm rounded-2xl py-3.5 px-4 outline-none transition-all duration-200 shadow-sm"
                  />
                </div>

                {isSignUp && (
                  <div className="animate-slide-down">
                    <label className="block text-[13px] font-medium text-slate-600 mb-1.5 pl-1">
                      内测邀请密钥
                    </label>
                    <input
                      type="text"
                      required
                      disabled={loading}
                      placeholder="请输入您的内测邀请码"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-400/50 text-slate-800 placeholder-slate-400 text-sm rounded-2xl py-3.5 px-4 outline-none transition-all duration-200 shadow-sm"
                    />
                  </div>
                )}

                <div className="flex justify-center py-2.5">
                  <div id="turnstile-container-modal" className="relative overflow-hidden min-h-[65px] flex items-center justify-center"></div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-medium text-sm py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>验证处理中...</span>
                    </>
                  ) : (
                    <span>{isSignUp ? '立即推开门进入' : '安全验证并登录'}</span>
                  )}
                </button>
              </form>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleTestLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-slate-50 text-slate-600 font-medium text-sm py-3.5 rounded-2xl transition-all duration-300 border border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  免密一键体验测试账号
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
