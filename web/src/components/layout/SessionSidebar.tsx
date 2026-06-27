import { useEffect, useState, useRef } from 'react';
import { Loader2, MessageSquareText, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore';


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
}

export function SessionSidebar({ isOpen, onClose }: SessionSidebarProps) {
  const token = useAuthStore(state => state.token);
  const sessionId = useChatStore(state => state.sessionId);
  const loadSession = useChatStore(state => state.loadSession);
  const clearChat = useChatStore(state => state.clearChat);

  const sessions = useSessionStore(state => state.sessions);
  const isLoadingSessions = useSessionStore(state => state.isLoadingSessions);
  const setSessions = useSessionStore(state => state.setSessions);
  const setIsLoadingSessions = useSessionStore(state => state.setIsLoadingSessions);

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
        onClose();
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || '打开会话失败';
      setError(msg);
    } finally {
      setLoadingId(null);
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.aside
            ref={sidebarRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="h-full w-[min(360px,88vw)] bg-surface-container/60 backdrop-blur-xl border-e border-outline-variant/30 shadow-2xl p-4 flex flex-col font-sans"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="历史对话侧边栏"
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="text-[13px] font-mono tracking-widest text-on-surface flex items-center gap-2 uppercase">
                  <MessageSquareText className="w-4 h-4" strokeWidth={1.5} />
                  历史对话
                </div>
                <div className="text-[11px] text-on-surface-variant font-light mt-1 tracking-wide">
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
                onClose();
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
                    <motion.button
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      key={session.id}
                      type="button"
                      onClick={() => void openSession(session.id)}
                      className={`w-full text-start rounded-chip border ps-3 pe-3 py-2.5 transition-colors cursor-pointer ${
                        active
                          ? 'bg-surface border-outline-variant shadow-sm'
                          : 'bg-surface-container/35 border-outline-variant/20 hover:bg-surface-container/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-light tracking-wide text-on-surface truncate">
                            {session.title || '新对话'}
                          </div>
                          <div className="text-[9.5px] font-mono text-on-surface-variant/70 mt-1">
                            {formatTime(session.updated_at)}
                          </div>
                        </div>
                        {loadingId === session.id && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-on-surface-variant" />}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
