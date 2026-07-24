import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { ReThinkLogo } from '../layout/ReThinkLogo';

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
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
                aria-label="Admin Token"
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
                  role="alert"
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
