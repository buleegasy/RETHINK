import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import type { FC } from 'react';
import { Loader2, MessageSquareText, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';
import type { EmotionResult } from '../../hooks/useFaceEmotion';

const CameraPanel = lazy(() => import('../chat/CameraPanel').then(m => ({ default: m.CameraPanel })));

import { authApi } from '../../api/auth';

function formatTime(seconds: number) {
  if (!seconds) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(seconds * 1000));
}

interface SessionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onEmotionChange?: (emotion: EmotionResult | null) => void;
}

export const SessionSidebar: FC<SessionSidebarProps> = ({ isOpen, onClose, onEmotionChange }) => {
  const { token, user, logout } = useAuthStore(
    useShallow((state) => ({
      token: state.token,
      user: state.user,
      logout: state.logout,
    }))
  );

  const { sessionId, loadSession, clearChat } = useChatStore(
    useShallow((state) => ({
      sessionId: state.sessionId,
      loadSession: state.loadSession,
      clearChat: state.clearChat,
    }))
  );

  const { sessions, isLoadingSessions, setSessions, setIsLoadingSessions } = useSessionStore(
    useShallow((state) => ({
      sessions: state.sessions,
      isLoadingSessions: state.isLoadingSessions,
      setSessions: state.setSessions,
      setIsLoadingSessions: state.setIsLoadingSessions,
    }))
  );

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousActiveElement = document.activeElement as HTMLElement | null;

    const getFocusableElements = (element: HTMLElement) => {
      return element.querySelectorAll<HTMLElement>(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
      );
    };

    const focusSidebar = () => {
      if (sidebarRef.current) {
        const focusable = getFocusableElements(sidebarRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    };
    
    const timer = setTimeout(focusSidebar, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && sidebarRef.current) {
        const focusable = Array.from(getFocusableElements(sidebarRef.current));
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement;

        if (e.shiftKey) {
          if (active === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (active === last) {
            first.focus();
            e.preventDefault();
          }
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose]);

  const fetchSessions = async (autoRestore = false) => {
    if (!token) return;
    setIsLoadingSessions(true);
    setError(null);
    try {
      const data = await authApi.getSessions();
      const nextSessions = data.sessions || [];
      setSessions(nextSessions);

      if (autoRestore && !sessionId && nextSessions.length > 0) {
        await openSession(nextSessions[0].id);
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || '加载会话失败';
      setError(msg);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const openSession = async (id: string) => {
    if (!token || loadingId) return;
    setLoadingId(id);
    setError(null);
    try {
      const data = await authApi.getSessionDetail(id);
      if (data.session) {
        loadSession(data.session);
        if (window.innerWidth < 768) {
          onClose();
        }
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || '打开会话失败';
      setError(msg);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteSession = async (id: string) => {
    const ok = window.confirm('确定要删除这个对话吗？此操作不可恢复。');
    if (!ok) return;

    try {
      await authApi.deleteSession(id);
      setSessions(sessions.filter((s) => s.id !== id));
      if (id === sessionId) {
        clearChat();
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || '删除会话失败';
      setError(msg);
    }
  };

  useEffect(() => {
    if (token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchSessions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        ref={sidebarRef}
        className={`fixed md:static inset-y-0 left-0 z-50 h-full shrink-0 bg-surface-container/60 backdrop-blur-xl border-e border-outline-variant/30 shadow-2xl md:shadow-none flex flex-col font-sans overflow-hidden transition-all duration-300 ease-out ${
          isOpen
            ? 'translate-x-0 w-[min(360px,88vw)] md:w-[280px] p-5 opacity-100 visible md:visible'
            : '-translate-x-full w-0 p-0 border-transparent opacity-0 pointer-events-none invisible md:invisible md:w-0 md:p-0 md:border-transparent'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="历史对话侧边栏"
      >
        <div className="flex items-center mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
            aria-label="隐藏侧边栏"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="6" x2="20" y2="6"></line>
              <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
          </motion.button>
        </div>

        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-[13px] font-mono tracking-widest text-on-surface flex items-center gap-2 uppercase">
              <MessageSquareText className="w-4 h-4" strokeWidth={1.5} />
              历史对话
            </div>
            <div className="text-[11px] text-on-surface/70 font-normal mt-1 tracking-wide">
              同一账号的对话会保存在这里
            </div>
          </div>
          <motion.button
            whileHover={{ rotate: 180, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 250, damping: 12 }}
            type="button"
            onClick={() => void fetchSessions(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-colors cursor-pointer"
            aria-label="刷新历史对话"
          >
            {isLoadingSessions ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="w-4 h-4" strokeWidth={1.5} />}
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          type="button"
          onClick={() => {
            clearChat();
            if (window.innerWidth < 768) {
              onClose();
            }
          }}
          className="w-full mb-4 h-10 rounded-full bg-on-surface/90 text-surface text-xs font-medium tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-on-surface active:scale-[0.99] transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          新对话
        </motion.button>

        {error && (
          <div className="mb-3 rounded-chip bg-error-container/80 text-error text-xs px-3 py-2 border border-error/25">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pe-1">
          {sessions.length === 0 && !isLoadingSessions ? (
            <div className="text-xs text-on-surface-dim py-8 text-center font-light tracking-wide">
              还没有保存的对话
            </div>
          ) : (
            sessions.map((session) => {
              const active = session.id === sessionId;
              return (
                <motion.div
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => void openSession(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void openSession(session.id);
                    }
                  }}
                  className={`group relative w-full text-start rounded-chip border ps-3 pe-3 py-2.5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-gemini-blue/40 focus-visible:border-gemini-blue/60 focus-visible:outline-none ${
                    active
                      ? 'bg-surface-container-highest border-transparent shadow-sm'
                      : 'bg-surface-container/35 border-outline-variant/20 hover:bg-surface-container/60'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeSessionPill"
                      className="absolute inset-0 bg-surface border border-outline-variant rounded-chip shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-light tracking-wide text-on-surface truncate">
                        {session.title || '新对话'}
                      </div>
                      <div className="text-[9.5px] font-mono text-on-surface-variant/70 mt-1">
                        {formatTime(session.updated_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {loadingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-on-surface-variant" />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteSession(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded-full text-on-surface-variant/60 hover:text-error hover:bg-error/10 transition-all cursor-pointer"
                          aria-label="删除此对话"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Embedded Camera Panel & Account Info */}
        <div className="mt-auto pt-4 flex-shrink-0 w-full flex flex-col">
          <div className="w-full flex flex-col gap-3 bg-surface-container/40 border border-outline-variant/20 rounded-[20px] p-3 shadow-sm">
            {isOpen && (
              <Suspense fallback={
                <div role="status" aria-label="加载摄像头中..." className="flex items-center justify-center p-3 text-xs text-on-surface-variant gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gemini-blue" />
                  <span>加载摄像头...</span>
                </div>
              }>
                <CameraPanel onEmotionChange={onEmotionChange} />
              </Suspense>
            )}
            
            {user && (
              <div className="w-full flex items-center justify-between">
                <span className="text-[13px] tracking-wide text-on-surface-variant font-medium truncate pe-2 ps-1">
                  {user.username}
                </span>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={logout} 
                  className="text-[11px] tracking-wide text-on-surface hover:text-error transition-colors cursor-pointer px-3 py-1 bg-surface-container/50 hover:bg-error/10 border border-outline-variant/30 rounded-full shrink-0"
                >
                  退出
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
