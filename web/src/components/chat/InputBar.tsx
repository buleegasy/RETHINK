import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { CameraPanel } from './CameraPanel';
import type { EmotionResult } from '../../hooks/useFaceEmotion';

const EMOJI_CHIPS = [
  '🫠', '😭', '🥺', '🤡', '😑', '😡', 
  '🤢', '💤', '😰', '🧠', '🌧️', '🫂'
];

interface InputBarProps {
  onSend: (text: string) => void;
  onEmotionChange?: (emotion: EmotionResult | null) => void;
}

export const InputBar: React.FC<InputBarProps> = ({ onSend, onEmotionChange }) => {
  const [input, setInput] = useState('');
  const isStreaming = useChatStore(state => state.isStreaming);
  const fsmState = useChatStore(state => state.fsmState);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTranscript = useCallback((text: string) => {
    setInput(prev => {
      const trimmedPrev = prev.trim();
      return trimmedPrev ? `${trimmedPrev} ${text}` : text;
    });
  }, []);

  const {
    voiceState,
    transcript: interimTranscript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceInput(handleTranscript);

  const isListening = voiceState === 'listening';

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; 
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const textToSend = input.trim();
    if (textToSend && !isStreaming) {
      if (isListening) stopListening();
      onSend(textToSend);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const placeholder = isListening
    ? (interimTranscript ? interimTranscript : '正在听...')
    : (isStreaming ? '思考中...' : '向 RE-THINK 提问');

  const canSend = input.trim() && !isStreaming;

  const handleSendEmoji = (text: string) => {
    if (!isStreaming) {
      if (isListening) stopListening();
      onSend(text);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 w-full px-4 md:px-8 pb-[calc(max(env(safe-area-inset-bottom),24px))] pt-8 bg-gradient-to-t from-surface via-surface to-transparent z-30 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col items-center pointer-events-auto">
        
        {/* 摄像头情感感知（原生融合区） */}
        <div className="w-full mb-3 flex justify-start pl-2 md:pl-0 animate-fade-in">
          <CameraPanel onEmotionChange={onEmotionChange} />
        </div>

        {/* 表情包破冰快捷气泡 */}
        {fsmState === 'Onboarding' && !isStreaming && (
          <div className="w-full mb-4 flex gap-2.5 overflow-x-auto pb-2 justify-start md:justify-center animate-fade-in pointer-events-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {EMOJI_CHIPS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendEmoji(emoji)}
                type="button"
                className="flex items-center justify-center w-11 h-11 text-xl rounded-full border border-outline-variant bg-surface-container-high/80 hover:bg-surface-container-highest hover:scale-115 hover:rotate-6 hover:border-gemini-blue active:scale-90 transition-all duration-200 shrink-0 shadow-sm backdrop-blur cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className={`w-full relative rounded-[32px] transition-shadow duration-300 ${isStreaming ? 'gemini-thinking-glow' : 'shadow-md hover:shadow-lg focus-within:shadow-lg'}`}>
          <div className="relative flex items-end bg-surface-container-high rounded-[32px] overflow-hidden p-1">
            
            {/* Voice Button or Spacer */}
            {isVoiceSupported ? (
              <button
                onClick={handleVoiceToggle}
                disabled={isStreaming}
                aria-label={isListening ? '停止录音' : '语音输入'}
                className={`flex-shrink-0 w-10 h-10 ml-1 mb-1 rounded-full flex items-center justify-center transition-all duration-300 ease-md3-standard self-end ${
                  isListening
                    ? 'bg-gemini-blue/10 text-gemini-blue animate-pulse-gentle'
                    : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
                } ${isStreaming ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isListening ? (
                  <span className="relative flex items-center justify-center w-5 h-5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-gemini-blue/30 animate-ping-slow" />
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V22h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" x2="12" y1="19" y2="22"/>
                  </svg>
                )}
              </button>
            ) : (
              <div className="w-2 flex-shrink-0" />
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isStreaming}
              rows={1}
              style={{ margin: 0 }}
              className={`flex-1 bg-transparent px-3 py-3 text-[16px] leading-[24px] font-sans text-on-surface placeholder-on-surface-variant border-none focus:outline-none resize-none overflow-y-auto max-h-[160px] transition-opacity duration-200 ${
                isListening ? 'placeholder-gemini-blue' : ''
              } ${isStreaming ? 'opacity-70 cursor-not-allowed' : ''}`}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label="发送消息"
              className={`flex-shrink-0 w-10 h-10 mr-1 mb-1 rounded-full flex items-center justify-center transition-all duration-300 ease-md3-standard self-end ${
                canSend
                  ? 'bg-on-surface text-surface hover:scale-105 active:scale-95 shadow-sm'
                  : 'bg-transparent text-on-surface-variant cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"/>
              </svg>
            </button>

          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="text-center mt-3 pointer-events-auto">
          {voiceError && (
            <p className="text-xs text-error font-sans animate-fade-in mb-1">
              语音识别出错：{voiceError}
            </p>
          )}
          <span className="text-xs font-sans text-on-surface-variant">
            RE-THINK 生成的内容可能不准确。请在需要时寻求专业医疗帮助。
          </span>
        </div>
      </div>
    </div>
  );
};
