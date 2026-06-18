import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, LogOut, Plus, Trash2, Edit2, Check, X, ShieldAlert, Key } from 'lucide-react';
import { ReThinkLogo } from './components/layout/ReThinkLogo';

// Config
const API_BASE = import.meta.env.VITE_API_URL
  ? (import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`)
  : 'http://localhost:8787/api';

interface InvitationCode {
  code: string;
  max_uses: number;
  uses: number;
  created_at: string;
}

export default function AdminApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  
  if (!token) {
    return <AdminLogin onLogin={(t) => {
      localStorage.setItem('admin_token', t);
      setToken(t);
    }} />;
  }

  return <AdminDashboard token={token} onLogout={() => {
    localStorage.removeItem('admin_token');
    setToken(null);
  }} />;
}

// -------------------------------------------------------------
// Admin Login Component
// -------------------------------------------------------------
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      setError('Token is required');
      return;
    }
    onLogin(inputToken.trim());
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <ReThinkLogo />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-medium tracking-tight">Admin Access</h1>
          </div>
          
          <p className="text-white/50 text-sm mb-6">
            Enter the master admin token to manage invitation codes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Admin Token"
                value={inputToken}
                onChange={(e) => {
                  setInputToken(e.target.value);
                  setError('');
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/5 transition-all"
              />
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm overflow-hidden"
                >
                  <p className="py-1">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              className="w-full bg-white text-black font-medium rounded-xl px-4 py-3 text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
            >
              Access Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Admin Dashboard Component
// -------------------------------------------------------------
function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newMaxUses, setNewMaxUses] = useState(1);

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editMaxUses, setEditMaxUses] = useState(1);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/admin/invitations`, {
        headers: { 'x-admin-token': token }
      });
      if (res.status === 401) {
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch codes');
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/admin/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({
          code: newCode.trim() || undefined,
          maxUses: newMaxUses
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      setIsCreating(false);
      setNewCode('');
      setNewMaxUses(1);
      fetchCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete ${code}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/invitations/${code}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': token }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdate = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/invitations/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token
        },
        body: JSON.stringify({ maxUses: editMaxUses })
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditingCode(null);
      fetchCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <ReThinkLogo />
            <span className="text-white/30">|</span>
            <span className="font-medium tracking-wide flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Key Management
            </span>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-sm text-white/70 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </header>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl mb-6 text-sm border border-red-500/20">
            {error}
          </div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-medium text-white/90">Invitation Codes</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            {isCreating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Cancel' : 'New Code'}
          </button>
        </div>

        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-6"
            >
              <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Custom Code (Optional)</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP2026"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-white/50 mb-2 uppercase tracking-wider">Max Uses</label>
                  <input
                    type="number"
                    min="1"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-white text-black px-6 py-2 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors h-[42px]"
                >
                  Generate
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-medium text-white/60">Code</th>
                  <th className="px-6 py-4 font-medium text-white/60">Uses / Max</th>
                  <th className="px-6 py-4 font-medium text-white/60">Status</th>
                  <th className="px-6 py-4 font-medium text-white/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/40">Loading codes...</td>
                  </tr>
                ) : codes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-white/40 flex flex-col items-center gap-3">
                      <Key className="w-8 h-8 opacity-20" />
                      No invitation codes found
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => {
                    const isExhausted = code.uses >= code.max_uses;
                    const isEditing = editingCode === code.code;
                    
                    return (
                      <tr key={code.code} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono font-medium tracking-wider text-blue-300">
                          {code.code}
                        </td>
                        <td className="px-6 py-4 text-white/70">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <span>{code.uses} /</span>
                              <input
                                type="number"
                                min={code.uses}
                                value={editMaxUses}
                                onChange={(e) => setEditMaxUses(parseInt(e.target.value) || code.uses)}
                                className="w-16 bg-black/40 border border-white/20 rounded px-2 py-1 text-xs"
                              />
                            </div>
                          ) : (
                            <span>{code.uses} / {code.max_uses}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isExhausted ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                          }`}>
                            {isExhausted ? 'Exhausted' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleUpdate(code.code)}
                                  className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingCode(null)}
                                  className="p-1.5 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingCode(code.code);
                                  setEditMaxUses(code.max_uses);
                                }}
                                className="p-1.5 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                                title="Edit Max Uses"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(code.code)}
                              className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors ml-2"
                              title="Delete Code"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
