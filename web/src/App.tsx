import { useState, useCallback, useRef } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { InputBar } from './components/InputBar';
import { AmbientGlow } from './components/AmbientGlow';
import { LoginWall } from './components/LoginWall';
import { SessionSidebar } from './components/SessionSidebar';
import { useChat } from './hooks/useChat';
import { useChatStore } from './store/chatStore';
import type { UserProfile } from './types';
import type { EmotionResult } from './hooks/useFaceEmotion';
import { EMOTION_MAP } from './hooks/useFaceEmotion';
import { CrisisOverlay } from './components/CrisisOverlay';

function App() {
  const { sendMessage, error } = useChat();
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  
  // Auth state
  const isAuthenticated = useChatStore(state => state.isAuthenticated);
  const user = useChatStore(state => state.user);
  const logout = useChatStore(state => state.logout);
  const fsmState = useChatStore(state => state.fsmState);

  const [, setCurrentEmotion] = useState<EmotionResult | null>(null);
  
  // 用于记录每一次对话周期内（从上一次发送到本次发送之间）的所有情绪帧
  const emotionHistoryRef = useRef<EmotionResult[]>([]);

  const handleEmotionChange = useCallback((emotion: EmotionResult | null) => {
    setCurrentEmotion(emotion);
    if (emotion) {
      emotionHistoryRef.current.push(emotion);
    }
  }, []);

  const handleSendWithEmotion = useCallback((text: string, profile?: UserProfile) => {
    let emotionPayload = undefined;

    if (emotionHistoryRef.current.length > 0) {
      // 计算这一段时间（周期）内的情绪平均值
      const avgScores: Record<string, number> = {};
      for (const e of emotionHistoryRef.current) {
        for (const [k, v] of Object.entries(e.allEmotions)) {
          avgScores[k] = (avgScores[k] || 0) + (v as number);
        }
      }

      const len = emotionHistoryRef.current.length;
      let maxLabel = 'neutral';
      let maxScore = 0;

      for (const [k, v] of Object.entries(avgScores)) {
        const avg = v / len;
        if (k !== 'neutral' && avg > maxScore) {
          maxScore = avg;
          maxLabel = k;
        }
      }

      // 如果整个周期的非平静情绪平均值超过 3%（0.03），则作为本轮周期的整体情绪发给 AI
      if (maxScore > 0.03) {
        emotionPayload = {
          label: maxLabel,
          labelZh: EMOTION_MAP[maxLabel as keyof typeof EMOTION_MAP].zh,
          confidence: Math.round(maxScore * 100),
        };
      }

      // 清空周期记录，开始下一轮记录
      emotionHistoryRef.current = [];
    }

    sendMessage(text, profile, emotionPayload);
  }, [sendMessage]);

  return (
    <div className="fixed inset-0 flex w-full overflow-hidden bg-surface-dim">
      <AmbientGlow />

      {/* 主对话区 */}
      <div className="flex flex-col flex-1 h-full relative">
        {/* ── 移动端顶部 Header ── */}
        <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 bg-transparent shrink-0 z-20">
          {/* 左侧：品牌 */}
          <div className="flex items-center">
            <h1 className="text-[17px] font-display font-medium text-on-surface opacity-80">
              RE-THINK
            </h1>
          </div>

          {/* 右侧：退出 */}
          <div className="flex items-center">
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-xs text-error/80 font-medium px-3 py-1.5 hover:bg-error-container/20 rounded-full transition-colors duration-200"
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
        {hasCompletedOnboarding && (
          <InputBar 
            onSend={handleSendWithEmotion} 
            onEmotionChange={handleEmotionChange} 
          />
        )}
      </div>

      {/* ── Session History ── */}
      {isAuthenticated && <SessionSidebar />}

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

      {/* 登录、验证码墙 */}
      {!isAuthenticated && <LoginWall />}

      {/* 危机干预覆盖层 */}
      {fsmState === 'Crisis_Escalation' && <CrisisOverlay />}
    </div>
  );
}

export default App;
