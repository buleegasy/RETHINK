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
      const maxH = window.innerWidth < 768 ? 100 : 160;
      textarea.style.height = `${Math.min(scrollHeight, maxH)}px`;
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
    <div className="absolute bottom-0 left-0 w-full px-4 md:px-8 pb-[calc(max(env(safe-area-inset-bottom),24px))] pt-8 bg-gradient-to-t from-slate-50/90 via-slate-50/40 to-transparent z-30 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col items-center pointer-events-auto">
        
        {/* 摄像头情感感知（原生融合区） */}
        <div className="w-full mb-3 flex justify-start pl-2 md:pl-0 animate-fade-in">
          <CameraPanel onEmotionChange={onEmotionChange} />
        </div>

        {/* 表情包破冰快捷气泡 */}
        {fsmState === 'Onboarding' && !isStreaming && (
          <div className="w-full mb-2 md:mb-4 flex gap-4 overflow-x-auto pb-2 justify-start md:justify-center animate-fade-in pointer-events-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {EMOJI_CHIPS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendEmoji(emoji)}
                type="button"
                className="flex items-center justify-center text-3xl hover:scale-125 hover:-translate-y-2 hover:rotate-6 active:scale-90 transition-all duration-300 shrink-0 cursor-pointer snap-center opacity-70 hover:opacity-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className={`w-full relative transition-all duration-500 ${isStreaming ? 'opacity-50' : ''}`}>
          <div className="relative flex items-end border-b border-slate-300/50 pb-2">
            
            {/* Voice Button or Spacer */}
            {isVoiceSupported ? (
              <button
                onClick={handleVoiceToggle}
                disabled={isStreaming}
                aria-label={isListening ? '停止录音' : '语音输入'}
                className={`flex-shrink-0 px-2 py-1 mb-1 font-mono text-[10px] tracking-widest uppercase transition-all duration-300 ease-out self-end ${
                  isListening
                    ? 'text-amber-600 animate-pulse-gentle'
                    : 'text-slate-400 hover:text-slate-800'
                } ${isStreaming ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isListening ? '[ LISTENING ]' : '[ MIC ]'}
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
              className={`flex-1 bg-transparent px-4 py-2 text-[16px] md:text-[18px] leading-[28px] font-sans font-light tracking-wide text-slate-800 placeholder-slate-400 border-none focus:outline-none resize-none overflow-y-auto max-h-[100px] md:max-h-[160px] transition-opacity duration-200 ${
                isListening ? 'placeholder-amber-600/60' : ''
              } ${isStreaming ? 'cursor-not-allowed' : ''}`}
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              aria-label="发送消息"
              className={`flex-shrink-0 px-3 py-1 mb-1 font-mono text-[10px] tracking-widest uppercase transition-all duration-300 ease-out self-end ${
                canSend
                  ? 'text-slate-800 hover:text-slate-500 hover:tracking-[0.3em]'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              [ SEND ]
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
