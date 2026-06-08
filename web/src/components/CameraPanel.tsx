import React, { useEffect, useRef } from 'react';
import { useFaceEmotion, EMOTION_MAP } from '../hooks/useFaceEmotion';
import type { EmotionResult } from '../hooks/useFaceEmotion';

interface CameraPanelProps {
  onEmotionChange?: (emotion: EmotionResult | null) => void;
}

export const CameraPanel: React.FC<CameraPanelProps> = ({ onEmotionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    isCameraActive,
    isModelLoading,
    currentEmotion,
    videoRef,
    startCamera,
    error,
    setCanvasRef,
  } = useFaceEmotion();

  // 挂载时自动启动，并设置 canvas 引用
  useEffect(() => {
    setCanvasRef(canvasRef.current);
    startCamera();
  }, [setCanvasRef, startCamera]);

  useEffect(() => {
    onEmotionChange?.(currentEmotion);
  }, [currentEmotion, onEmotionChange]);

  const emotionInfo = currentEmotion ? EMOTION_MAP[currentEmotion.label] : null;

  return (
    <div className="w-full flex items-center justify-start pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-surface-container-high border border-outline-variant/30 shadow-sm flex items-center gap-3 p-2 backdrop-blur-md">
        
        {/* 摄像头视图区域 (小圆形/胶囊状) */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full overflow-hidden bg-surface-dim shadow-inner ring-2 ring-surface/50">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] z-10 transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* 错误或加载状态 */}
          {(isModelLoading || !isCameraActive || error) && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-dim z-20">
              {error ? (
                <span className="text-xs text-error font-bold">!</span>
              ) : (
                <div className="w-5 h-5 border-2 border-gemini-blue-pale border-t-gemini-blue rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* 情绪信息区域 */}
        <div className="flex flex-col justify-center pr-3 min-w-[120px]">
          {error ? (
            <p className="text-[11px] text-error leading-tight">{error}</p>
          ) : isModelLoading ? (
            <p className="text-xs text-on-surface-variant animate-pulse">加载模型中...</p>
          ) : !isCameraActive ? (
            <p className="text-xs text-on-surface-variant">启动中...</p>
          ) : currentEmotion && emotionInfo ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{emotionInfo.emoji}</span>
                <span className="text-xs font-medium text-on-surface">{emotionInfo.zh}</span>
                <span className="text-[10px] font-mono text-gemini-blue bg-gemini-blue/10 px-1 rounded">
                  {currentEmotion.confidence}%
                </span>
              </div>
              {/* 置信度微型进度条 */}
              <div className="w-full h-1 bg-on-surface/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-300 ease-out"
                  style={{ width: `${currentEmotion.confidence}%` }}
                />
              </div>
              <p className="text-[9px] text-on-surface-dim mt-1">本地面部识别 (不上传视频)</p>
            </>
          ) : (
            <p className="text-xs text-on-surface-variant">面孔检测中...</p>
          )}
        </div>

      </div>
    </div>
  );
};
