import { useEffect, useState } from 'react';
import { Loader2, MessageSquareText, Plus, RefreshCw } from 'lucide-react';
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
      const data = await authApi.getSessionDetail(id);
      if (data.session) {
        loadSession(data.session);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '打开会话失败');
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
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={onClose}>
          <aside
            className="h-full w-[min(360px,88vw)] bg-white/70 backdrop-blur-2xl border-r border-white/40 shadow-2xl p-4 flex flex-col font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="text-[13px] font-serif tracking-widest text-slate-800 flex items-center gap-2 uppercase">
                  <MessageSquareText className="w-4 h-4" strokeWidth={1.5} />
                  历史对话
                </div>
                <div className="text-[11px] text-slate-500 font-light mt-1 tracking-wide">
                  同一账号的对话会保存在这里
                </div>
              </div>
              <button
                type="button"
                onClick={() => void fetchSessions(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white/50 transition-colors"
                aria-label="刷新历史对话"
              >
                {isLoadingSessions ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <RefreshCw className="w-4 h-4" strokeWidth={1.5} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                clearChat();
                onClose();
              }}
              className="w-full mb-4 h-10 rounded-full bg-slate-800/85 text-white text-xs font-light tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.99] transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              新对话
            </button>

            {error && (
              <div className="mb-3 rounded-xl bg-red-50 text-red-500 text-xs px-3 py-2 border border-red-100">
                {error}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sessions.length === 0 && !isLoadingSessions ? (
                <div className="text-xs text-slate-400 py-8 text-center font-light tracking-wide">
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
                          ? 'bg-white/80 border-slate-300 shadow-sm'
                          : 'bg-white/30 border-white/40 hover:bg-white/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-light tracking-wide text-slate-800 truncate">
                            {session.title || '新对话'}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 font-light">
                            {formatTime(session.updated_at)}
                          </div>
                        </div>
                        {loadingId === session.id && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-400" />}
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
