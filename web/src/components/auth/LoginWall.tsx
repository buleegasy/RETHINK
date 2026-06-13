import { useState, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import type { AuthResponse } from '../../types';

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
  const login = useAuthStore(state => state.login);
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
    <div className="fixed inset-0 z-50 flex bg-surface-dim/80 backdrop-blur-md overflow-hidden">
      
      {/* Left Section (Visuals/Branding) - Hidden on mobile, visible on lg screens */}
      <div className="hidden lg:flex flex-col flex-1 relative items-center justify-center overflow-hidden bg-surface">
        {/* Abstract animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
        </div>
        
        {/* Large Decorative Graphic or Typography */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-2xl">
          <div className="w-24 h-24 bg-surface-container rounded-[28px] flex items-center justify-center border border-outline-variant/30 shadow-xl mb-8 transform hover:scale-105 transition-transform duration-500">
            <LoginSparkle className="w-12 h-12" />
          </div>
          <h1 className="text-[44px] leading-tight font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-400 mb-6 tracking-tight">
            重塑认知<br />遇见更好的自己
          </h1>
          <p className="text-lg text-on-surface-variant leading-relaxed max-w-md">
            RE-THINK 是一个基于认知行为疗法 (CBT) 的智能干预空间，帮助青少年在安全的数字化环境中完成情绪疏导与认知重建。
          </p>
        </div>
      </div>

      {/* Right Section (Login Form) - Full width on mobile, fixed width on lg screens */}
      <div className="w-full lg:w-[480px] xl:w-[540px] flex items-center justify-center px-4 py-8 lg:px-12 bg-transparent lg:bg-surface-container-low/50 lg:border-l border-outline-variant/30 overflow-y-auto relative shadow-2xl">
        
        {/* Mobile-only background glows */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none lg:hidden" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none lg:hidden" />

        {/* Form Container */}
        <div className="relative w-full max-w-md bg-surface/65 lg:bg-transparent lg:border-none lg:shadow-none lg:backdrop-blur-none border border-outline-variant/30 backdrop-blur-2xl rounded-[32px] shadow-2xl p-8 md:p-10 transition-all duration-300">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="lg:hidden w-16 h-16 bg-surface-container rounded-[22px] flex items-center justify-center border border-outline-variant/30 shadow-sm mb-4 transform hover:scale-105 transition-transform duration-300">
              <LoginSparkle className="w-9 h-9" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-display font-semibold text-on-surface text-center">
              欢迎回来
            </h2>
            <p className="text-sm text-on-surface-variant mt-2 text-center px-2 leading-relaxed">
              请登录或注册以继续您的旅程
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

        {/* Test Account Button */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleTestLogin}
            disabled={loading}
            className="w-full bg-surface-container/60 hover:bg-surface-container-high/80 text-on-surface-variant font-medium text-sm py-3.5 rounded-2xl transition-all duration-300 border border-outline-variant/30 hover:border-outline-variant/60 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            免密一键体验测试账号
          </button>
        </div>

        {/* Beta Notice Footer */}
        <p className="text-[11px] text-on-surface-dim mt-6 text-center leading-relaxed">
          内测阶段，系统数据采用 Cloudflare D1 隐私沙盒托管。<br />
          如果遇到问题，请联系系统管理员。
        </p>

        </div>
      </div>
    </div>
  );
}
