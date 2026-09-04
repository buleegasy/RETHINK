import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';

export function useAudioVisualizer(stream: MediaStream | null) {
  // Use targeted selector to prevent unnecessary re-renders when other state changes
  const setAudioLevel = useChatStore(state => state.setAudioLevel);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!stream) {
      setAudioLevel(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    if (!audioCtxRef.current) {
      audioCtxRef.current = new window.AudioContext();
    }
    const ctx = audioCtxRef.current;
    
    // Ensure context is resumed if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createMediaStreamSource(stream);
    const analyserNode = ctx.createAnalyser();
    
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.7;
    
    source.connect(analyserNode);
    setAnalyser(analyserNode);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    const updateAudioLevel = () => {
      analyserNode.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      
      // Calculate average volume (0-255)
      const avg = sum / dataArray.length;
      
      // Normalize to 0-1 range with a small floor threshold to ignore tiny noise
      const level = Math.max(0, (avg - 5) / 250);
      
      setAudioLevel(Math.min(1, level));
      
      rafRef.current = requestAnimationFrame(updateAudioLevel);
    };

    updateAudioLevel();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
    };
  }, [stream, setAudioLevel]);

  return analyser;
}
