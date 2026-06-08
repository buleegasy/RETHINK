import { useState, useCallback } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { InputBar } from './components/InputBar';
import { CameraPanel } from './components/CameraPanel';
import { AmbientGlow } from './components/AmbientGlow';
import { LoginWall } from './components/LoginWall';
import { useChat } from './hooks/useChat';
import { useChatStore } from './store/chatStore';
import type { UserProfile } from './types';
import type { EmotionResult } from './hooks/useFaceEmotion';
import { EMOTION_MAP } from './hooks/useFaceEmotion';
import { CrisisOverlay } from './components/CrisisOverlay';

/** Gemini sparkle SVG icon */
const GeminiSparkle = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z" fill="url(#gemini-grad)"/>
    <defs>
      <linearGradient id="gemini-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4"/>
        <stop offset="1" stopColor="#00BCD4"/>
      </linearGradient>
    </defs>
  </svg>
);

function App() {
  const { sendMessage, error } = useChat();
  const selectedModel = useChatStore(state => state.selectedModel);
  const setSelectedModel = useChatStore(state => state.setSelectedModel);
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  
  // Auth state
  const isAuthenticated = useChatStore(state => state.isAuthenticated);
  const user = useChatStore(state => state.user);
  const logout = useChatStore(state => state.logout);
  const fsmState = useChatStore(state => state.fsmState);

  const [currentEmotion, setCurrentEmotion] = useState<EmotionResult | null>(null);

  const handleSendWithEmotion = useCallback((text: string, profile?: UserProfile) => {
    const emotionPayload = currentEmotion && currentEmotion.label !== 'neutral' && currentEmotion.confidence > 50
      ? {
          label: currentEmotion.label,
          labelZh: EMOTION_MAP[currentEmotion.label].zh,
          confidence: currentEmotion.confidence,
        }
      : undefined;
    sendMessage(text, profile, emotionPayload);
  }, [currentEmotion, sendMessage]);

  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-surface-dim">
      <AmbientGlow />

      {/* 主对话区 */}
      <div className="flex flex-col flex-1 h-full relative">
        {/* ── 移动端顶部 Header ── */}
        <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 bg-surface shrink-0 z-20 border-b border-outline-variant/50">
          {/* 左侧：品牌 */}
          <div className="flex items-center gap-2">
            <GeminiSparkle className="w-6 h-6" />
            <h1 className="text-[17px] font-display font-medium text-on-surface">
              RE-THINK
            </h1>
          </div>

          {/* 右侧：模型选择 + 退出 */}
          <div className="flex items-center gap-3">
            {/* 模型选择器 */}
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-surface-container text-on-surface-variant text-xs font-medium py-1.5 px-3 pr-7 rounded-full border-none outline-none appearance-none cursor-pointer hover:bg-surface-container-high transition-colors duration-200"
              >
                <option value="deepseek-v3">DeepSeek V3</option>
                <option value="llama-3.4">Llama 3.4</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-on-surface-dim">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-xs text-error font-medium px-2 py-1.5 hover:bg-error-container/20 rounded-full transition-colors duration-200"
              >
                退出
              </button>
            )}
          </div>
        </div>

        {/* ── 错误 Snackbar ── */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-error-container text-error px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        <ChatPanel />
        {hasCompletedOnboarding && <InputBar onSend={handleSendWithEmotion} />}
      </div>

      {/* ── Desktop Profile Pill ── */}
      {isAuthenticated && user && (
        <div className="absolute top-4 right-4 z-40 hidden md:flex items-center gap-3 bg-surface/65 backdrop-blur-md border border-outline-variant/30 px-4 py-2 rounded-full shadow-sm">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
            {user.username.substring(0, 2)}
          </div>
          <span className="text-xs font-medium text-on-surface">{user.username}</span>
          <button 
            onClick={logout} 
            className="text-[11px] text-error hover:text-error-hover pl-2 border-l border-outline-variant/30 ml-1 transition-colors duration-200"
          >
            退出登录
          </button>
        </div>
      )}

      {/* 摄像头情绪面板 */}
      <CameraPanel onEmotionChange={setCurrentEmotion} />

      {/* 登录、验证码墙 */}
      {!isAuthenticated && <LoginWall />}

      {/* 危机干预覆盖层 */}
      {fsmState === 'Crisis_Escalation' && <CrisisOverlay />}
    </div>
  );
}

export default App;
