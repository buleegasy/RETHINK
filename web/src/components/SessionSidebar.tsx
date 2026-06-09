import { useEffect, useState } from 'react';
import { History, Loader2, MessageSquareText, Plus, RefreshCw } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import type { ChatSessionDetail, ChatSessionSummary } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatTime(seconds: number) {
  if (!seconds) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(seconds * 1000));
}

export function SessionSidebar() {
  const token = useChatStore(state => state.token);
  const sessionId = useChatStore(state => state.sessionId);
  const sessions = useChatStore(state => state.sessions);
  const isLoadingSessions = useChatStore(state => state.isLoadingSessions);
  const setSessions = useChatStore(state => state.setSessions);
  const setIsLoadingSessions = useChatStore(state => state.setIsLoadingSessions);
  const loadSession = useChatStore(state => state.loadSession);
  const clearChat = useChatStore(state => state.clearChat);

  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async (autoRestore = false) => {
    if (!token) return;
    setIsLoadingSessions(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`加载会话失败：${res.status}`);
      const data = await res.json() as { sessions?: ChatSessionSummary[] };
      const nextSessions = data.sessions || [];
      setSessions(nextSessions);

      if (autoRestore && !sessionId && nextSessions.length > 0) {
        await openSession(nextSessions[0].id);
      }
    } catch (err: any) {
      setError(err.message || '加载会话失败');
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const openSession = async (id: string) => {
    if (!token || loadingId) return;
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/sessions/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`打开会话失败：${res.status}`);
      const data = await res.json() as { session?: ChatSessionDetail };
      if (data.session) {
        loadSession(data.session);
        setIsOpen(false);
      }
    } catch (err: any) {
      setError(err.message || '打开会话失败');
    } finally {
      setLoadingId(null);
    }
  };

  useEffect(() => {
    if (token) {
      void fetchSessions(true);
    }
  }, [token]);

  if (!token) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="历史对话"
        className="absolute top-4 left-4 z-40 hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-surface/65 backdrop-blur-md border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high shadow-sm transition-colors"
      >
        <History className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="历史对话"
        className="md:hidden fixed bottom-24 left-4 z-40 w-10 h-10 flex items-center justify-center rounded-full bg-surface/80 backdrop-blur-md border border-outline-variant/30 text-on-surface-variant shadow-sm"
      >
        <History className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <aside
            className="h-full w-[min(360px,88vw)] bg-surface border-r border-outline-variant/30 shadow-2xl p-4 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold text-on-surface flex items-center gap-2">
                  <MessageSquareText className="w-4 h-4" />
                  历史对话
                </div>
                <div className="text-xs text-on-surface-variant mt-1">
                  同一账号的对话会保存在这里
                </div>
              </div>
              <button
                type="button"
                onClick={() => void fetchSessions(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                aria-label="刷新历史对话"
              >
                {isLoadingSessions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                clearChat();
                setIsOpen(false);
              }}
              className="w-full mb-3 h-10 rounded-full bg-on-surface text-surface text-sm font-medium flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform"
            >
              <Plus className="w-4 h-4" />
              新对话
            </button>

            {error && (
              <div className="mb-3 rounded-xl bg-error-container/40 text-error text-xs px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sessions.length === 0 && !isLoadingSessions ? (
                <div className="text-sm text-on-surface-variant py-8 text-center">
                  还没有保存的对话
                </div>
              ) : (
                sessions.map((session) => {
                  const active = session.id === sessionId;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => void openSession(session.id)}
                      className={`w-full text-left rounded-2xl border px-3 py-3 transition-colors ${
                        active
                          ? 'bg-surface-container-highest border-gemini-blue/40'
                          : 'bg-surface-container/45 border-outline-variant/20 hover:bg-surface-container-high'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-on-surface truncate">
                            {session.title || '新对话'}
                          </div>
                          <div className="text-[11px] text-on-surface-variant mt-1">
                            {formatTime(session.updated_at)}
                          </div>
                        </div>
                        {loadingId === session.id && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-on-surface-variant" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
