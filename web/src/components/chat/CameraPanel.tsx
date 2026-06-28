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
    stopCamera,
    error,
    setCanvasRef,
  } = useFaceEmotion();

  // 挂载时自动启动，并设置 canvas 引用，卸载时清理
  useEffect(() => {
    setCanvasRef(canvasRef.current);
    startCamera();
    
    return () => {
      stopCamera();
      setCanvasRef(null);
    };
  }, [setCanvasRef, startCamera, stopCamera]);

  // 使用 ref 来避免外部传入的 onEmotionChange 引起副作用重复触发
  const onEmotionChangeRef = useRef(onEmotionChange);
  useEffect(() => {
    onEmotionChangeRef.current = onEmotionChange;
  }, [onEmotionChange]);

  useEffect(() => {
    if (onEmotionChangeRef.current) {
      onEmotionChangeRef.current(currentEmotion);
    }
  }, [currentEmotion]);

  const emotionInfo = currentEmotion ? EMOTION_MAP[currentEmotion.label] : null;

  return (
    <div className="w-full flex items-center justify-start pointer-events-auto">
      <div className="relative overflow-hidden rounded-2xl bg-surface-container/30 border border-outline-variant/30 shadow-sm flex items-center gap-2 md:gap-3 p-1.5 md:p-2 backdrop-blur-md">
        
        {/* 摄像头视图区域 (小圆形/胶囊状) */}
        <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full overflow-hidden bg-surface-container-high shadow-inner ring-1 ring-outline-variant/40">
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
            <div className="absolute inset-0 flex items-center justify-center bg-surface-dim/80 z-20 backdrop-blur-sm">
              {error ? (
                <span className="text-xs text-error font-light tracking-widest">!</span>
              ) : (
                <div className="w-5 h-5 border-2 border-outline-variant border-t-on-surface-variant rounded-full animate-spin" />
              )}
            </div>
          )}
        </div>

        {/* 情绪信息区域 */}
        <div className="flex flex-col justify-center pe-2 md:pe-3 min-w-[100px] md:min-w-[120px]">
          {error ? (
            <p className="text-[10px] font-light tracking-wide text-error leading-tight">{error}</p>
          ) : isModelLoading ? (
            <p className="text-[10px] font-light tracking-widest text-on-surface-variant/80 animate-pulse">加载模型中...</p>
          ) : !isCameraActive ? (
            <p className="text-[10px] font-light tracking-widest text-on-surface-variant/80">启动中...</p>
          ) : currentEmotion && emotionInfo ? (
            <>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base leading-none">{emotionInfo.emoji}</span>
                <span className="text-[11px] font-light tracking-wider text-on-surface">{emotionInfo.zh}</span>
                <span className="text-[9px] font-light tracking-widest text-on-surface-variant bg-surface px-1.5 py-0.5 rounded-sm border border-outline-variant/30">
                  {currentEmotion.confidence}%
                </span>
              </div>
              {/* 置信度微型进度条 */}
              <div className="w-full h-[3px] bg-surface-container-high rounded-full overflow-hidden">
                <div 
                  className="h-full bg-on-surface-variant/60 transition-all duration-300 ease-out"
                  style={{ width: `${currentEmotion.confidence}%` }}
                />
              </div>
              <p className="text-[8px] font-light tracking-widest text-on-surface-dim mt-1.5">本地检测</p>
            </>
          ) : (
            <p className="text-[10px] font-light tracking-widest text-on-surface-variant/80">面孔检测中...</p>
          )}
        </div>

      </div>
    </div>
  );
};
