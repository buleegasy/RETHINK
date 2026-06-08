import { useState, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import type { AuthResponse } from '../types';

declare global {
  interface Window {
    turnstile?: any;
  }
}

/** Sparkle SVG logo matching Gemini Welcome */
const LoginSparkle = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z" fill="url(#login-grad)"/>
    <defs>
      <linearGradient id="login-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1"/>
        <stop offset="1" stopColor="#06B6D4"/>
      </linearGradient>
    </defs>
  </svg>
);

export function LoginWall() {
  const login = useChatStore(state => state.login);
  const sessionId = useChatStore(state => state.sessionId);

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically load Cloudflare Turnstile script & initialize
  useEffect(() => {
    let active = true;
    
    const initTurnstile = () => {
      if (!active) return;
      if (window.turnstile) {
        try {
          const container = document.getElementById('turnstile-container');
          if (container) {
            container.innerHTML = ''; // Clear previous instances
            setTurnstileToken(null);
            window.turnstile.render('#turnstile-container', {
              sitekey: '0x4AAAAAADgdD3JygbJ4oXZi', // Production Turnstile sitekey
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

    if (!window.turnstile) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = initTurnstile;
    } else {
      setTimeout(initTurnstile, 50); // Small timeout to ensure DOM mounted
    }

    return () => {
      active = false;
    };
  }, [isSignUp]);

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
        // Reset turnstile to force a new check on failure
        if (window.turnstile) window.turnstile.reset('#turnstile-container');
        setTurnstileToken(null);
        return;
      }

      // Login success
      login(data.user, data.token);

      // Perform session binding if a session already exists locally
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
      if (window.turnstile) window.turnstile.reset('#turnstile-container');
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dim/80 backdrop-blur-md px-4 overflow-y-auto">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Card Container */}
      <div className="relative w-full max-w-md bg-surface/65 border border-outline-variant/30 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8 md:p-10 transition-all duration-300">
        
        {/* Sparkle Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-surface-container rounded-[22px] flex items-center justify-center border border-outline-variant/30 shadow-sm mb-4 transform hover:scale-105 transition-transform duration-300">
            <LoginSparkle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-display font-semibold text-on-surface">
            RE-THINK
          </h2>
          <p className="text-sm text-on-surface-variant mt-1.5 text-center px-4 leading-relaxed">
            基于 CBT 心理辅导的青少年认知重塑空间
          </p>
        </div>

        {/* Custom Tab Selector */}
        <div className="flex bg-surface-container-high/60 rounded-full p-1.5 border border-outline-variant/20 mb-6 relative z-10">
          <button
            type="button"
            className={`flex-1 text-center py-2 text-[14px] font-medium rounded-full transition-all duration-300 ${
              !isSignUp
                ? 'bg-surface shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
          >
            登录已有账号
          </button>
          <button
            type="button"
            className={`flex-1 text-center py-2 text-[14px] font-medium rounded-full transition-all duration-300 ${
              isSignUp
                ? 'bg-surface shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
          >
            新用户注册
          </button>
        </div>

        {/* Error Alert Panel */}
        {error && (
          <div className="mb-5 bg-error-container/40 border border-error/20 text-error text-[13px] px-4 py-3 rounded-2xl flex items-start gap-2.5 animate-slide-up">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5 pl-1">
              用户名
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder="请输入内测用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-container/60 hover:bg-surface-container-high/60 focus:bg-surface-container-high border border-outline-variant/30 focus:border-primary/50 text-on-surface text-sm rounded-2xl py-3.5 px-4 outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5 pl-1">
              密码
            </label>
            <input
              type="password"
              required
              disabled={loading}
              placeholder="请输入密码（最少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container/60 hover:bg-surface-container-high/60 focus:bg-surface-container-high border border-outline-variant/30 focus:border-primary/50 text-on-surface text-sm rounded-2xl py-3.5 px-4 outline-none transition-all duration-200"
            />
          </div>

          {/* Invitation Code (Signup Only) */}
          {isSignUp && (
            <div className="animate-slide-down">
              <label className="block text-[13px] font-medium text-on-surface-variant mb-1.5 pl-1">
                内测邀请密钥
              </label>
              <input
                type="text"
                required
                disabled={loading}
                placeholder="请输入您的内测邀请码"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                className="w-full bg-surface-container/60 hover:bg-surface-container-high/60 focus:bg-surface-container-high border border-outline-variant/30 focus:border-primary/50 text-on-surface text-sm rounded-2xl py-3.5 px-4 outline-none transition-all duration-200"
              />
            </div>
          )}

          {/* Cloudflare Turnstile Challenge Container */}
          <div className="flex justify-center py-2.5">
            <div id="turnstile-container" className="relative overflow-hidden min-h-[65px] flex items-center justify-center"></div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium text-sm py-4 rounded-2xl transition-all duration-300 shadow-md shadow-indigo-500/10 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
              <span>{isSignUp ? '立即注册并进入' : '安全验证并登录'}</span>
            )}
          </button>
        </form>

        {/* Beta Notice Footer */}
        <p className="text-[11px] text-on-surface-dim mt-6 text-center leading-relaxed">
          内测阶段，系统数据采用 Cloudflare D1 隐私沙盒托管。<br />
          如果遇到问题，请联系系统管理员。
        </p>

      </div>
    </div>
  );
}
