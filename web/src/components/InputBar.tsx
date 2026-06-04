import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { useChatStore } from '../store/chatStore';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface InputBarProps {
  onSend: (text: string) => void;
}

export const InputBar: React.FC<InputBarProps> = ({ onSend }) => {
  const [input, setInput] = useState('');
  const isStreaming = useChatStore(state => state.isStreaming);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 语音转录回调
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

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const textToSend = input.trim();
    if (textToSend && !isStreaming) {
      if (isListening) stopListening();
      onSend(textToSend);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
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
    : (isStreaming ? '思考中...' : '想聊点什么？');

  const canSend = input.trim() && !isStreaming;

  return (
    <div className="absolute bottom-0 left-0 w-full px-4 md:px-6 pb-[calc(max(env(safe-area-inset-bottom),16px))] bg-surface border-t border-outline-variant/30 pt-3 z-30">
      <div className="max-w-3xl mx-auto">
        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* Microphone button */}
          {isVoiceSupported && (
            <button
              onClick={handleVoiceToggle}
              disabled={isStreaming}
              aria-label={isListening ? '停止录音' : '语音输入'}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ease-md3-standard ${
                isListening
                  ? 'border-gemini-blue text-gemini-blue animate-pulse-gentle'
                  : 'border-outline text-on-surface-variant hover:border-on-surface-variant hover:text-on-surface'
              } ${isStreaming ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {isListening ? (
                <span className="relative flex items-center justify-center w-5 h-5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-gemini-blue/30 animate-ping-slow" />
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V22h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
          )}

          {/* Input pill */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isStreaming}
              className={`w-full bg-surface-container rounded-input px-5 py-3.5 text-[15px] font-sans text-on-surface placeholder-on-surface-dim border-none focus:outline-none focus:ring-2 focus:ring-gemini-blue/30 resize-none overflow-y-auto min-h-[48px] max-h-[200px] leading-relaxed transition-all duration-200 ease-md3-standard ${
                isListening ? 'placeholder-gemini-blue' : ''
              } ${isStreaming ? 'opacity-60 cursor-not-allowed' : ''}`}
              rows={1}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="发送消息"
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-md3-standard ${
              canSend
                ? 'bg-gemini-blue text-white hover:shadow-md active:scale-95'
                : 'bg-surface-container-high text-on-surface-dim cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>

        {/* Bottom disclaimer */}
        <div className="text-center mt-2.5 mb-0.5">
          {voiceError && (
            <p className="text-xs text-error font-sans animate-fade-in mb-1">
              语音识别出错：{voiceError}
            </p>
          )}
          <span className="text-xs font-sans text-on-surface-dim">
            AI 生成的内容仅供参考
          </span>
        </div>
      </div>
    </div>
  );
};
