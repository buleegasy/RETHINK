import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

import { ChatPanel } from './components/chat/ChatPanel';
import { InputBar } from './components/chat/InputBar';
import { LoginWall } from './components/auth/LoginWall';
import { SessionSidebar } from './components/layout/SessionSidebar';
import { useChat } from './hooks/useChat';
import { useChatStore } from './store/chatStore';
import { useAuthStore } from './store/authStore';
import type { UserProfile, FSMState } from './types';
import type { EmotionResult } from './hooks/useFaceEmotion';
import { EMOTION_MAP } from './hooks/useFaceEmotion';
import { CrisisOverlay } from './components/crisis/CrisisOverlay';

const FSM_ORDER: FSMState[] = ['Active_Listening', 'CBT_Stripping', 'Socratic_Questioning', 'Crisis_Escalation'];

function App() {
  const { sendMessage, error } = useChat();
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const fsmState = useChatStore(state => state.fsmState);

  const [, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // 计算进度
  const stageIndex = fsmState === 'Onboarding' ? 0 : FSM_ORDER.indexOf(fsmState as FSMState) + 1;
  
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
    <div className="fixed inset-0 flex w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-surface-dim text-on-surface font-sans selection:bg-gemini-blue/20">
      {isAuthenticated ? (
        <>
          {/* 主对话区 (Workspace Layout) */}
          <div className="flex flex-col flex-1 h-full relative z-10 bg-surface-dim">
            {/* ── 移动端顶部 Header ── */}
            <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 shrink-0 z-20 border-b border-outline-variant/30">
              {/* 左侧：Hamburger 菜单 */}
              <div className="flex items-center w-[80px] justify-start">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSidebarOpen(true)}
                  className="text-on-surface-variant hover:text-on-surface min-w-[44px] min-h-[44px] flex items-center justify-start transition-colors cursor-pointer"
                  aria-label="打开侧边栏"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-on-surface-variant">
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                    <line x1="4" y1="6" x2="20" y2="6"></line>
                    <line x1="4" y1="18" x2="20" y2="18"></line>
                  </svg>
                </motion.button>
              </div>

              {/* 中间：品牌 */}
              <div className="flex items-center justify-center flex-1">
                <h1 className="text-sm font-serif tracking-[0.2em] font-light text-on-surface uppercase">
                  RETHINK
                </h1>
              </div>

              {/* 右侧：阶段药丸 + 退出 */}
              <div className="flex items-center w-[80px] justify-end gap-1.5">
                {stageIndex > 0 && (
                  <div className="text-[11px] tracking-wide text-on-surface-variant">
                    {stageIndex}/4
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout}
                  className="text-[11px] text-on-surface-variant hover:text-on-surface px-2 min-h-[44px] flex items-center justify-center transition-colors cursor-pointer"
                >
                  退出
                </motion.button>
              </div>
            </div>

            {/* ── 错误 Snackbar ── */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -20, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                className="absolute top-4 left-1/2 z-50 bg-error-container/95 backdrop-blur-md border border-error/20 text-error px-5 py-3 rounded-2xl shadow-md text-xs font-light tracking-wide flex items-center gap-2.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                {error}
              </motion.div>
            )}

            <ChatPanel />
            {hasCompletedOnboarding && (
              <InputBar 
                onSend={handleSendWithEmotion} 
                onEmotionChange={handleEmotionChange} 
              />
            )}
          </div>

          {/* ── Session History Sidebar ── */}
          <SessionSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          
          {/* ── Desktop History Button ── */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="历史对话"
            className="absolute top-6 left-6 z-40 hidden md:flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-2 bg-surface-container/30 hover:bg-surface-container/60 border border-outline-variant/30 rounded-full w-10 h-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </motion.button>

          {/* ── Desktop Profile Pill ── */}
          {user && (
            <div className="absolute top-6 right-6 z-40 hidden md:flex items-center gap-4">
              <span className="text-[11px] tracking-wide text-on-surface-variant">
                {user.username}
              </span>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout} 
                className="text-[11px] tracking-wide text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                退出
              </motion.button>
            </div>
          )}

          {/* 危机干预覆盖层 */}
          {fsmState === 'Crisis_Escalation' && <CrisisOverlay />}
        </>
      ) : (
        /* Render ONLY LoginWall if not authenticated. Workspace elements are completely unmounted. */
        <LoginWall />
      )}
    </div>
  );
}

export default App;
