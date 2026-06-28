import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { GeminiWelcome } from './GeminiWelcome';
import { EmojiSelector } from './EmojiSelector';
import { useChat } from '../../hooks/useChat';
import { chatApi } from '../../api/chat';

export const ChatPanel: React.FC = () => {
  const messages = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);
  const hasCompletedOnboarding = useChatStore(state => state.hasCompletedOnboarding);
  const sessionId = useChatStore(state => state.sessionId);
  const deleteMessage = useChatStore(state => state.deleteMessage);
  
  const setOnboardingComplete = useChatStore(state => state.setOnboardingComplete);
  const { sendMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [showEmojiSelector, setShowEmojiSelector] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleStart = () => {
    // 切换到表情包选择大屏
    setShowEmojiSelector(true);
  };

  const handleSelectEmoji = (emojiText: string) => {
    // 标记破冰开始，将表情包作为首条输入发送给 AI 并激活聊天界面
    setOnboardingComplete(true);
    sendMessage(emojiText);
  };

  const handleSkipEmoji = () => {
    // 直接解锁输入框，不发送预设表情包，由用户自由输入第一句
    setOnboardingComplete(true);
  };

  const handleDelete = async () => {
    if (!deletingMessageId) return;
    setIsDeleting(true);
    try {
      await chatApi.deleteMessage(sessionId || '', deletingMessageId);
      deleteMessage(deletingMessageId);
      setDeletingMessageId(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteRequest = useCallback((messageId: string) => {
    setDeletingMessageId(messageId);
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 md:px-8 md:py-8 scroll-smooth bg-transparent relative z-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-1">
        {!hasCompletedOnboarding ? (
          !showEmojiSelector ? (
            <GeminiWelcome onStart={handleStart} />
          ) : (
            <EmojiSelector onSelect={handleSelectEmoji} onSkip={handleSkipEmoji} />
          )
        ) : (
          messages.map((msg, idx) => {
            const prev = messages[idx - 1];
            const next = messages[idx + 1];
            const isFirstInGroup = !prev || prev.isHidden || prev.role !== msg.role;
            const isLastInGroup = !next || next.isHidden || next.role !== msg.role;
            // Add extra top margin when a new "speaker" starts
            const needsGroupSep = isFirstInGroup && idx > 0;
            return (
              <div key={msg.id || idx} className={needsGroupSep ? 'mt-4' : ''}>
                <MessageBubble
                  message={msg}
                  isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  onDeleteRequest={handleDeleteRequest}
                />
              </div>
            );
          })
        )}
        {hasCompletedOnboarding && <div className="h-[220px] md:h-[280px] shrink-0" />}
      </div>

      <AnimatePresence>
        {deletingMessageId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeletingMessageId(null)}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative bg-surface-container border border-outline-variant/30 shadow-2xl rounded-2xl p-6 max-w-sm w-full mx-4 z-10 space-y-4 text-on-surface"
            >
              <h3 className="text-lg font-semibold">确认删除消息？</h3>
              <p className="text-sm text-on-surface-variant">
                删除后该消息将无法恢复，且会影响后续对话的上下文生成。
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeletingMessageId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-stage-red text-white hover:bg-stage-red/90 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>删除中...</span>
                    </>
                  ) : (
                    <span>删除</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
