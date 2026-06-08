import { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';

export type EmotionLabel =
  | 'happy' | 'sad' | 'angry' | 'fearful'
  | 'disgusted' | 'surprised' | 'neutral';

export const EMOTION_MAP: Record<EmotionLabel, { zh: string; emoji: string; color: string }> = {
  happy:     { zh: '开心',   emoji: '😊', color: '#F59E0B' },
  sad:       { zh: '悲伤',   emoji: '😢', color: '#60A5FA' },
  angry:     { zh: '愤怒',   emoji: '😠', color: '#EF4444' },
  fearful:   { zh: '恐惧',   emoji: '😨', color: '#8B5CF6' },
  disgusted: { zh: '厌恶',   emoji: '🤢', color: '#10B981' },
  surprised: { zh: '惊讶',   emoji: '😲', color: '#F97316' },
  neutral:   { zh: '平静',   emoji: '😐', color: '#9CA3AF' },
};

export interface EmotionResult {
  label: EmotionLabel;
  confidence: number;
  allEmotions: Partial<Record<EmotionLabel, number>>;
}

export interface UseFaceEmotionReturn {
  isCameraActive: boolean;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  currentEmotion: EmotionResult | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  error: string | null;
}

const MODEL_URL = '/cv-models/';
let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

export function useFaceEmotion(): UseFaceEmotionReturn {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(modelsLoaded);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

  // 分析单帧情绪
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !isActiveRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.paused) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detection || !isActiveRef.current) return;

      const expressions = detection.expressions;
      const entries = Object.entries(expressions) as [EmotionLabel, number][];
      const [topLabel, topScore] = entries.reduce(
        (best, curr) => (curr[1] > best[1] ? curr : best),
        ['neutral' as EmotionLabel, 0]
      );

      const allEmotions: Partial<Record<EmotionLabel, number>> = {};
      for (const [k, v] of entries) {
        allEmotions[k] = Math.round(v * 100) / 100;
      }

      setCurrentEmotion({
        label: topLabel,
        confidence: Math.round(topScore * 100),
        allEmotions,
      });
    } catch {
      // 单帧失败静默跳过
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);

    // 加载模型（只加载一次）
    if (!modelsLoaded) {
      setIsModelLoading(true);
      try {
        await loadModels();
        setIsModelLoaded(true);
      } catch (err: any) {
        setError(`情绪识别模型加载失败: ${err?.message || err}`);
        setIsModelLoading(false);
        return;
      }
      setIsModelLoading(false);
    }

    // 请求摄像头权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }

      isActiveRef.current = true;
      setIsCameraActive(true);

      // 每 800ms 分析一帧（平衡性能与实时性）
      intervalRef.current = setInterval(analyzeFrame, 800);
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          setError('摄像头权限被拒绝，请在浏览器设置中允许访问');
        } else if (e.name === 'NotFoundError') {
          setError('未找到摄像头设备');
        } else {
          setError('无法启动摄像头');
        }
      }
    }
  }, [analyzeFrame]);

  const stopCamera = useCallback(() => {
    isActiveRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
    setCurrentEmotion(null);
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    isCameraActive,
    isModelLoaded,
    isModelLoading,
    currentEmotion,
    videoRef,
    startCamera,
    stopCamera,
    error,
  };
}
