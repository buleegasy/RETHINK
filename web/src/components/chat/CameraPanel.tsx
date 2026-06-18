import React, { useEffect, useRef } from 'react';
import { useFaceEmotion, EMOTION_MAP } from '../../hooks/useFaceEmotion';
import type { EmotionResult } from '../../hooks/useFaceEmotion';

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
      <div className="relative overflow-hidden rounded-2xl bg-white/40 border border-white/40 shadow-sm flex items-center gap-2 md:gap-3 p-1.5 md:p-2 backdrop-blur-md">
        
        {/* 摄像头视图区域 (小圆形/胶囊状) */}
        <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full overflow-hidden bg-slate-200/50 shadow-inner ring-1 ring-white/60">
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
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-20 backdrop-blur-sm">
              {error ? (
                <span className="text-xs text-red-400 font-light tracking-widest">!</span>
              ) : (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* 情绪信息区域 */}
        <div className="flex flex-col justify-center pr-2 md:pr-3 min-w-[100px] md:min-w-[120px]">
          {error ? (
            <p className="text-[10px] font-light tracking-wide text-red-400 leading-tight">{error}</p>
          ) : isModelLoading ? (
            <p className="text-[10px] font-light tracking-widest text-slate-500 animate-pulse">加载模型中...</p>
          ) : !isCameraActive ? (
            <p className="text-[10px] font-light tracking-widest text-slate-500">启动中...</p>
          ) : currentEmotion && emotionInfo ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{emotionInfo.emoji}</span>
                <span className="text-[11px] font-light tracking-wider text-slate-700">{emotionInfo.zh}</span>
                <span className="text-[9px] font-light tracking-widest text-slate-500 bg-white/50 px-1.5 py-0.5 rounded-sm border border-white/40">
                  {currentEmotion.confidence}%
                </span>
              </div>
              {/* 置信度微型进度条 */}
              <div className="w-full h-[3px] bg-slate-200/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 transition-all duration-300 ease-out"
                  style={{ width: `${currentEmotion.confidence}%` }}
                />
              </div>
              <p className="text-[8px] font-light tracking-widest text-slate-400 mt-1.5">本地检测</p>
            </>
          ) : (
            <p className="text-[10px] font-light tracking-widest text-slate-500">面孔检测中...</p>
          )}
        </div>

      </div>
    </div>
  );
};
