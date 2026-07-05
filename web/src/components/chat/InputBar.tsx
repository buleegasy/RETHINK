import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface InputBarProps {
  onSend: (text: string) => void;
}

export const InputBar: React.FC<InputBarProps> = ({ onSend }) => {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const isStreaming = useChatStore(state => state.isStreaming);
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

  const lastHeightRef = useRef<number>(0);
  const lastInputLengthRef = useRef<number>(0);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      const currentLength = input.length;
      const prevLength = lastInputLengthRef.current;
      lastInputLengthRef.current = currentLength;
      const maxH = window.innerWidth < 768 ? 100 : 160;

      if (currentLength < prevLength || currentLength === 0) {
        // Only set height to 'auto' to recalculate when the input length decreases (e.g. deletion, clear)
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const targetHeight = Math.min(scrollHeight, maxH);
        textarea.style.height = `${targetHeight}px`;
        lastHeightRef.current = targetHeight;
      } else {
        // When typing forward, scrollHeight will naturally expand if text wraps
        const scrollHeight = textarea.scrollHeight;
        const targetHeight = Math.min(scrollHeight, maxH);
        if (lastHeightRef.current !== targetHeight) {
          textarea.style.height = `${targetHeight}px`;
          lastHeightRef.current = targetHeight;
        }
      }
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

  return (
    <div className="absolute bottom-0 start-0 w-full ps-4 pe-4 md:ps-8 md:pe-8 pb-[calc(max(env(safe-area-inset-bottom),24px))] pt-8 bg-gradient-to-t from-surface/95 via-surface/40 to-transparent z-30 pointer-events-none">

      <div className="max-w-2xl ms-auto me-auto flex flex-col items-center pointer-events-auto">


        {/* Input Container */}
        <div className={`w-full relative transition-all duration-500 max-w-[1280px] mx-auto ${isStreaming ? 'opacity-50' : ''}`}>
          <div className={`relative flex items-end bg-surface-container/60 backdrop-blur-[20px] shadow-inner-light rounded-[32px] p-2 gap-1 transition-all duration-200 ${
            isFocused
              ? 'border border-primary/50 ring-4 ring-primary/20'
              : 'border border-transparent hover:border-outline/20 shadow-sm'
          }`}>
            
            {/* Voice Button or Spacer */}
            {isVoiceSupported ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleVoiceToggle}
                disabled={isStreaming}
                aria-label={isListening ? '停止录音' : '语音输入'}
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full self-end ${
                  isListening
                    ? 'text-error animate-pulse-gentle'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
                } ${isStreaming ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="8" height="12" x="8" y="2" rx="4"/>
                  <path d="M4 14a8 8 0 0 0 16 0"/>
                  <line x1="12" y1="22" x2="12" y2="19"/>
                </svg>
              </motion.button>
            ) : (
              <div className="w-2 flex-shrink-0" />
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={isStreaming}
              rows={1}
              className={`flex-1 bg-transparent ps-2 pe-2 md:ps-4 md:pe-4 py-2 m-0 text-[15px] md:text-[16px] leading-[24px] font-sans font-light tracking-wide text-on-surface placeholder-on-surface-dim border-none focus:outline-none resize-none overflow-y-auto max-h-[100px] md:max-h-[160px] transition-opacity duration-200 ${
                isListening ? 'placeholder-stage-orange/60' : ''
              } ${isStreaming ? 'cursor-not-allowed' : ''}`}
            />

            {/* Send Button */}
            <motion.button
              whileHover={canSend ? { scale: 1.1 } : {}}
              whileTap={canSend ? { scale: 0.9 } : {}}
              onClick={handleSend}
              disabled={!canSend}
              aria-label="发送消息"
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full self-end ${
                canSend
                  ? 'text-on-surface hover:bg-surface-container-high/60 cursor-pointer'
                  : 'text-outline cursor-not-allowed opacity-30'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </motion.button>

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
