import React, { useState } from 'react';
import { useFaceEmotion, EMOTION_MAP } from '../hooks/useFaceEmotion';
import type { EmotionResult } from '../hooks/useFaceEmotion';

interface CameraPanelProps {
  onEmotionChange?: (emotion: EmotionResult | null) => void;
}

/** Pastel background colors for each emotion (MD3-friendly soft tones) */
const EMOTION_BG: Record<string, string> = {
  happy:     'bg-amber-50',
  sad:       'bg-blue-50',
  angry:     'bg-red-50',
  fearful:   'bg-purple-50',
  disgusted: 'bg-emerald-50',
  surprised: 'bg-orange-50',
  neutral:   'bg-gray-100',
};

const EMOTION_TEXT: Record<string, string> = {
  happy:     'text-amber-700',
  sad:       'text-blue-700',
  angry:     'text-red-700',
  fearful:   'text-purple-700',
  disgusted: 'text-emerald-700',
  surprised: 'text-orange-700',
  neutral:   'text-gray-600',
};

export const CameraPanel: React.FC<CameraPanelProps> = ({ onEmotionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    isCameraActive,
    isModelLoading,
    currentEmotion,
    videoRef,
    startCamera,
    stopCamera,
    error,
  } = useFaceEmotion();

  // 通知父组件情绪变化
  React.useEffect(() => {
    onEmotionChange?.(currentEmotion);
  }, [currentEmotion, onEmotionChange]);

  const handleToggle = async () => {
    if (isOpen) {
      stopCamera();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      await startCamera();
    }
  };

  const emotionInfo = currentEmotion ? EMOTION_MAP[currentEmotion.label] : null;

  return (
    <>
      {/* 浮动摄像头开关按钮（当面板关闭时显示） */}
      {!isOpen && (
        <button
          id="camera-toggle-btn"
          onClick={handleToggle}
          title="开启情绪感知摄像头"
          className="fixed bottom-[88px] right-4 z-40 w-11 h-11 rounded-full bg-surface shadow-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:shadow-xl active:scale-95 transition-all duration-200 ease-md3-standard md:bottom-[96px]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>
      )}

      {/* 摄像头面板 */}
      {isOpen && (
        <div
          id="camera-panel"
          className={`fixed z-40 transition-all duration-300 ease-md3-emphasized ${
            isMinimized
              ? 'bottom-[88px] right-4 w-11 h-11'
              : 'bottom-[88px] right-4 w-[200px] md:w-[220px] md:bottom-[96px]'
          }`}
        >
          {isMinimized ? (
            /* 最小化状态：只显示情绪 emoji */
            <button
              onClick={() => setIsMinimized(false)}
              className="w-full h-full rounded-full bg-surface shadow-lg flex items-center justify-center text-xl hover:bg-surface-container hover:shadow-xl active:scale-95 transition-all duration-200 ease-md3-standard"
              title="展开摄像头面板"
            >
              {emotionInfo ? emotionInfo.emoji : '📷'}
            </button>
          ) : (
            /* 展开状态 */
            <div className="bg-surface rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden animate-fade-in">
              {/* 顶部控制栏 */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant/20">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isCameraActive ? 'bg-gemini-blue animate-pulse-gentle' : 'bg-on-surface-dim'}`} />
                  <span className="text-[11px] text-on-surface-variant font-medium font-sans">
                    {isModelLoading ? '加载模型...' : isCameraActive ? '情绪感知中' : '摄像头'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:bg-surface-container-high transition-colors duration-150 ease-md3-standard"
                    title="最小化"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleToggle}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error active:bg-error-container transition-colors duration-150 ease-md3-standard"
                    title="关闭摄像头"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* 摄像头画面 */}
              <div className="relative w-full aspect-[4/3] bg-surface-dim overflow-hidden rounded-xl mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ease-md3-standard ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* 加载状态覆盖层 */}
                {(isModelLoading || !isCameraActive) && !error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-dim">
                    {isModelLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-gemini-blue-pale border-t-gemini-blue rounded-full animate-spin" />
                        <span className="text-[10px] text-on-surface-dim font-sans">加载 AI 模型...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-on-surface-dim">
                          <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                        <span className="text-[10px] text-on-surface-dim font-sans">等待画面</span>
                      </>
                    )}
                  </div>
                )}

                {/* 情绪叠加层 */}
                {isCameraActive && currentEmotion && emotionInfo && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <EmotionBadge emotion={currentEmotion} />
                  </div>
                )}

                {/* 错误覆盖层 */}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center bg-surface-dim">
                    <span className="text-xl">⚠️</span>
                    <span className="text-[10px] text-on-surface-variant leading-relaxed font-sans">{error}</span>
                  </div>
                )}
              </div>

              {/* 底部隐私说明 */}
              <div className="px-3 py-2 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-on-surface-dim flex-shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span className="text-[10px] text-on-surface-dim leading-tight font-sans">
                  本地分析，视频不上传
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

// 情绪徽章子组件 — MD3 colorful pill style
const EmotionBadge: React.FC<{ emotion: EmotionResult }> = ({ emotion }) => {
  const info = EMOTION_MAP[emotion.label];
  const bgClass = EMOTION_BG[emotion.label] || 'bg-gray-100';
  const textClass = EMOTION_TEXT[emotion.label] || 'text-gray-600';

  return (
    <div
      className={`rounded-full px-3 py-1.5 flex items-center gap-2 ${bgClass} shadow-sm backdrop-blur-sm`}
    >
      <span className="text-base leading-none">{info.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-[11px] font-medium leading-none font-sans ${textClass}`}>{info.zh}</span>
          <span className="text-[10px] text-on-surface-dim leading-none font-sans">{emotion.confidence}%</span>
        </div>
        {/* 置信度条 */}
        <div className="mt-1 h-1 rounded-full bg-black/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gemini-blue transition-all duration-500 ease-md3-standard"
            style={{ width: `${emotion.confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
};
