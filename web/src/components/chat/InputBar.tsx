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

  useEffect(() => {
    // Progressive enhancement: only use JS resize if CSS field-sizing is unsupported
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content')) {
      return;
    }
    
    const textarea = textareaRef.current;
    if (textarea) {
      const maxH = window.innerWidth < 768 ? 100 : 160;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const targetHeight = Math.min(scrollHeight, maxH);
      textarea.style.height = `${targetHeight}px`;
      lastHeightRef.current = targetHeight;
    }
  }, [input]);

  const handleSend = () => {
    const textToSend = input.trim();
    if (textToSend && !isStreaming) {
      if (isListening) stopListening();
      onSend(textToSend);
      setInput('');
      if (textareaRef.current) {
        if (!CSS.supports('field-sizing', 'content')) {
          textareaRef.current.style.height = 'auto';
        }
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
    : (isStreaming ? '思考中...' : '想聊一聊吗');

  const canSend = input.trim() && !isStreaming;

  return (
    <div className="absolute bottom-0 start-0 w-full ps-4 pe-4 md:ps-8 md:pe-8 pb-[calc(max(env(safe-area-inset-bottom),24px))] pt-8 z-30 pointer-events-none">

      <div className="max-w-3xl ms-auto me-auto flex flex-col items-center pointer-events-auto">


        {/* Input Container */}
        <div className={`w-full relative max-w-3xl mx-auto`}>
          <motion.div 
            animate={{
              boxShadow: isFocused
                ? '0 32px 80px rgba(0,0,0,0.15)'
                : '0 12px 48px rgba(0,0,0,0.08)'
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`inputbar-streaming-glow ${isStreaming ? 'is-glowing' : ''} relative flex items-end bg-[rgba(255,255,255,0.9)] backdrop-blur-[16px] p-2 gap-1 ${
              (input.includes('\n') || input.length > 60) ? 'rounded-3xl' : 'rounded-full'
            } ${
              isFocused
                ? 'border-[rgba(0,0,0,0.1)] ring-4 ring-black/5'
                : 'border border-[rgba(0,0,0,0.05)] hover:border-black/10'
            }`}
          >
            
            {/* Voice Button or Spacer */}
            {isVoiceSupported ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={handleVoiceToggle}
                disabled={isStreaming}
                aria-label={isListening ? '停止录音' : '语音输入'}
                title={isStreaming ? "AI思考中，暂时无法使用语音" : (isListening ? "停止录音" : "语音输入")}
                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full self-end focus-visible:ring-2 focus-visible:ring-gemini-blue focus-visible:outline-none ${
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
              aria-label="输入消息"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={isStreaming}
              rows={1}
              className={`flex-1 bg-transparent ps-2 pe-2 md:ps-4 md:pe-4 py-2 m-0 text-[15px] md:text-[16px] leading-[24px] font-sans font-light tracking-wide text-on-surface placeholder-on-surface/50 border-none focus:outline-none resize-none overflow-y-auto max-h-[100px] md:max-h-[160px] min-h-[40px] transition-opacity duration-200 ${
                isListening ? 'placeholder-stage-orange/60' : ''
              } ${isStreaming ? 'cursor-not-allowed' : ''}`}
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />

            {/* Send Button */}
            <motion.button
              whileHover={canSend ? { scale: 1.1 } : {}}
              whileTap={canSend ? { scale: 0.9 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              onClick={handleSend}
              disabled={!canSend}
              aria-label="发送消息"
              title={canSend ? "发送消息 (Enter)" : (isStreaming ? "AI思考中..." : "请输入消息内容")}
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full self-end focus-visible:ring-2 focus-visible:ring-gemini-blue focus-visible:outline-none ${
                canSend
                  ? 'text-on-surface hover:bg-surface-container-high/60 cursor-pointer'
                  : 'text-on-surface-variant/50 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </motion.button>

          </motion.div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="text-center mt-3 pointer-events-auto">
          {voiceError && (
            <p role="alert" className="text-xs text-error font-sans animate-fade-in mb-1">
              语音识别出错：{voiceError}
            </p>
          )}
          <span className="text-xs font-sans text-on-surface/70">
            RE-THINK 生成的内容可能不准确。请在需要时寻求专业医疗帮助。
          </span>
        </div>
      </div>
    </div>
  );
};
