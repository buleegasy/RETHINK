import { useState, useCallback } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { InputBar } from './components/InputBar';
import { CameraPanel } from './components/CameraPanel';
import { AmbientGlow } from './components/AmbientGlow';
import { useChat } from './hooks/useChat';
import { useChatStore } from './store/chatStore';
import type { UserProfile } from './types';
import type { EmotionResult } from './hooks/useFaceEmotion';
import { EMOTION_MAP } from './hooks/useFaceEmotion';

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

          {/* 右侧：模型选择 */}
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
        <InputBar onSend={handleSendWithEmotion} />
      </div>

      {/* 摄像头情绪面板 */}
      <CameraPanel onEmotionChange={setCurrentEmotion} />
    </div>
  );
}

export default App;
