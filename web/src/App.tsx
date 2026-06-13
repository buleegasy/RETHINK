import { useState, useCallback, useRef } from 'react';
import { History, Menu } from 'lucide-react';
import { ChatPanel } from './components/chat/ChatPanel';
import { InputBar } from './components/chat/InputBar';
import { AmbientGlow } from './components/layout/AmbientGlow';
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
  const stageColor = stageIndex === 0 ? '' : stageIndex === 1 ? 'bg-stage-blue' : stageIndex === 2 ? 'bg-stage-green' : stageIndex === 3 ? 'bg-stage-orange' : 'bg-stage-red';
  const stageTextColor = stageIndex === 0 ? '' : stageIndex === 1 ? 'text-stage-blue' : stageIndex === 2 ? 'text-stage-green' : stageIndex === 3 ? 'text-stage-orange' : 'text-stage-red';
  
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
        <div className="md:hidden flex items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pb-2.5 px-4 bg-surface shrink-0 z-20 border-b border-outline-variant/50">
          {/* 左侧：Hamburger 菜单 */}
          <div className="flex items-center w-[80px] justify-start">
            {isAuthenticated && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 -ml-1.5 text-on-surface-variant hover:bg-surface-container rounded-full"
                aria-label="打开侧边栏"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* 中间：品牌 */}
          <div className="flex items-center justify-center flex-1">
            <h1 className="text-[17px] font-display font-medium text-on-surface">
              RE-THINK
            </h1>
          </div>

          {/* 右侧：阶段药丸 + 退出 */}
          <div className="flex items-center w-[80px] justify-end gap-2">
            {stageIndex > 0 && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-medium ${stageTextColor}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${stageColor} animate-pulse`} />
                {stageIndex}/4
              </div>
            )}
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-xs text-error/80 font-medium px-2 py-1 hover:bg-error-container/20 rounded-full"
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

      {/* ── Session History Sidebar ── */}
      {isAuthenticated && <SessionSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />}
      
      {/* ── Desktop History Button ── */}
      {isAuthenticated && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="历史对话"
          className="absolute top-4 left-4 z-40 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-surface/65 backdrop-blur-md border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high shadow-sm transition-colors"
        >
          <History className="w-4 h-4" />
        </button>
      )}

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
