import { useState, useRef, useCallback, useEffect } from 'react';

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
  setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

export interface FaceApiNet {
  loadFromUri: (uri: string) => Promise<void>;
}

export interface FaceApiNets {
  ssdMobilenetv1: FaceApiNet;
  faceLandmark68Net: FaceApiNet;
  faceExpressionNet: FaceApiNet;
}

export interface FaceApiDraw {
  drawDetections: (canvas: HTMLCanvasElement, detections: unknown) => void;
  drawFaceLandmarks: (canvas: HTMLCanvasElement, detections: unknown) => void;
}

export interface FaceApiDetection {
  expressions: Record<string, number>;
}

export interface FaceApiDetectionWithLandmarks {
  withFaceExpressions: () => Promise<FaceApiDetection | undefined>;
}

export interface FaceApiDetectionSingle {
  withFaceLandmarks: () => FaceApiDetectionWithLandmarks;
}

export interface FaceAPI {
  nets: FaceApiNets;
  SsdMobilenetv1Options: new (options: { minConfidence: number }) => unknown;
  detectSingleFace: (video: HTMLVideoElement, options: unknown) => FaceApiDetectionSingle;
  matchDimensions: (canvas: HTMLCanvasElement, displaySize: { width: number; height: number }) => void;
  resizeResults: (detection: unknown, displaySize: { width: number; height: number }) => unknown;
  draw: FaceApiDraw;
}

declare global {
  interface Window {
    faceapi?: FaceAPI;
  }
}

const MODEL_URL = '/cv-models/';
let modelsLoaded = false;

async function loadModels() {
  const api = window.faceapi;
  if (!api) {
    throw new Error('faceapi library is not loaded on window object');
  }
  if (modelsLoaded) return;
  await Promise.all([
    api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    api.nets.faceExpressionNet.loadFromUri(MODEL_URL),
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
  const historyRef = useRef<Record<EmotionLabel, number>[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const setCanvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  // 分析单帧情绪
  const analyzeFrame = useCallback(async () => {
    console.log('[analyzeFrame] entered. api:', !!window.faceapi, 'video:', !!videoRef.current, 'active:', isActiveRef.current);
    const api = window.faceapi;
    if (!api || !videoRef.current || !isActiveRef.current) return;

    // Stop running if the document is hidden to conserve CPU
    if (typeof document !== 'undefined' && document.hidden) return;

    const video = videoRef.current;
    console.log('[analyzeFrame] video readyState:', video.readyState, 'paused:', video.paused);
    if (video.readyState < 2 || video.paused) return;

    try {
      const detection = await api
        .detectSingleFace(video, new api.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceExpressions();
      console.log('[analyzeFrame] detection resolved:', detection);

      if (!isActiveRef.current) return;

      if (!detection) {
        clearCanvas();
        return;
      }

      // 绘制覆盖层
      if (canvasRef.current) {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        if (displaySize.width > 0 && displaySize.height > 0) {
          api.matchDimensions(canvasRef.current, displaySize);
          const resizedDetections = api.resizeResults(detection, displaySize);
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
          api.draw.drawDetections(canvasRef.current, resizedDetections);
          api.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
        }
      }

      const expressions = detection.expressions as unknown as Record<EmotionLabel, number>;

      // 引入指数移动平均（EMA）进行平滑，而不是简单的窗口平均。
      // ALPHA 越高，对新表情的响应越快；越低，平滑去抖效果越好。
      const isE2E = typeof window !== 'undefined' && (window as any).__mockEmotionConfidence !== undefined;
      const ALPHA = isE2E ? 1.0 : 0.85; 
      
      let avgExpressions: Record<EmotionLabel, number>;
      if (!historyRef.current || historyRef.current.length === 0) {
        avgExpressions = { ...expressions };
        // 我们用一个数组的第0个元素存当前的EMA状态，为了不改 useRef 类型
        historyRef.current = [avgExpressions];
      } else {
        avgExpressions = historyRef.current[0];
        for (const k of Object.keys(expressions) as EmotionLabel[]) {
          avgExpressions[k] = avgExpressions[k] * (1 - ALPHA) + (expressions[k] || 0) * ALPHA;
        }
      }

      const entries = Object.entries(avgExpressions) as [EmotionLabel, number][];
      
      // 寻找非 neutral 的最高分数
      let maxNonNeutralLabel: EmotionLabel = 'neutral';
      let maxNonNeutralScore = 0;
      for (const [k, v] of entries) {
        if (k !== 'neutral' && v > maxNonNeutralScore) {
          maxNonNeutralScore = v;
          maxNonNeutralLabel = k;
        }
      }

      let topLabel: EmotionLabel = 'neutral';
      let topScore = avgExpressions['neutral'] || 0;

      // 核心微表情放大器：模型本身极度偏好 neutral (就算轻微皱眉 neutral 也会高达 0.8)
      // 因此我们只要非 neutral 的最高置信度突破了 0.05 (极低阈值)，就判定为该情绪。
      if (maxNonNeutralLabel !== 'neutral' && maxNonNeutralScore > 0.05) {
        topLabel = maxNonNeutralLabel;
        topScore = maxNonNeutralScore;
      }

      const allEmotions: Partial<Record<EmotionLabel, number>> = {};
      for (const [k, v] of entries) {
        allEmotions[k] = Math.round(v * 100) / 100;
      }

      setCurrentEmotion({
        label: topLabel,
        confidence: Math.round(topScore * 100),
        allEmotions,
      });
    } catch (err) {
      console.error('[analyzeFrame] error:', err);
    }
  }, [clearCanvas]);

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
      videoRef.current.onloadedmetadata = null;
    }

    setIsCameraActive(false);
    setCurrentEmotion(null);
    historyRef.current = [];
    clearCanvas();
  }, [clearCanvas]);

  const startCamera = useCallback(async () => {
    // Prevent starting multiple sessions concurrently
    if (isActiveRef.current || streamRef.current) {
      return;
    }

    isActiveRef.current = true;
    setError(null);

    // 加载模型（只加载一次）
    if (!modelsLoaded) {
      setIsModelLoading(true);
      try {
        await loadModels();
        setIsModelLoaded(true);
      } catch (err: unknown) {
        setError(`情绪识别模型加载失败: ${err instanceof Error ? err.message : String(err)}`);
        setIsModelLoading(false);
        isActiveRef.current = false;
        return;
      }
      setIsModelLoading(false);
    }

    // Check if stopCamera was called while loading models
    if (!isActiveRef.current) {
      return;
    }

    // 请求摄像头权限
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });

      // Secondary check: if stopCamera was called while waiting for getUserMedia
      if (!isActiveRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
      }

      setIsCameraActive(true);

      // Clean any accidental dangling interval before setting a new one
      if (intervalRef.current) clearInterval(intervalRef.current);
      // 每 800ms 分析一帧（平衡性能与实时性）
      intervalRef.current = setInterval(analyzeFrame, 800);
    } catch (e: unknown) {
      console.error('[startCamera] error name:', e instanceof Error ? e.name : typeof e, 'message:', e instanceof Error ? e.message : String(e));
      stopCamera();
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          setError('摄像头权限被拒绝，请在浏览器设置中允许访问');
        } else if (e.name === 'NotFoundError') {
          setError('未找到摄像头设备');
        } else {
          setError('无法启动摄像头');
        }
      } else {
        setError('无法启动摄像头');
      }
    }
  }, [analyzeFrame, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    isCameraActive,
    isModelLoaded,
    isModelLoading,
    currentEmotion,
    videoRef,
    startCamera,
    stopCamera,
    error,
    setCanvasRef,
  };
}
