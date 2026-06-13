import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoginModal } from './LoginModal';
import { ReThinkLogo } from '../layout/ReThinkLogo';
import { ShieldCheck, Brain, Clock, ChevronRight } from 'lucide-react';

export function LoginWall() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white overflow-y-auto overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Absolute Ambient Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute top-[-10%] left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full bg-indigo-500/20 blur-[120px]"
          animate={{ x: [0, 100, -50, 0], y: [0, -50, 50, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[5%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-cyan-500/15 blur-[120px]"
          animate={{ x: [0, -80, 60, 0], y: [0, 50, -40, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-purple-500/15 blur-[100px]"
          animate={{ x: [0, 50, -50, 0], y: [0, 50, -50, 0], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ReThinkLogo />
        </div>
        <button 
          onClick={() => setIsLoginModalOpen(true)}
          className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium transition-all backdrop-blur-md"
        >
          登录
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 mt-12 md:mt-24 mb-32">
        <div className="relative w-full flex justify-center items-center min-h-[400px]">
          
          {/* Floating Progress Card (Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="hidden xl:block absolute left-0 top-[10%] w-[260px] bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl z-20"
          >
            <h3 className="text-sm font-medium text-white/80 mb-4">您的进度</h3>
            <div className="space-y-3 text-xs text-white/60">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center"><Clock className="w-3 h-3 text-indigo-300" /></div>
                <span>第 8 节：<span className="text-white">心理韧性</span></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center"><Brain className="w-3 h-3 text-cyan-300" /></div>
                <span>咨询师：<span className="text-white">AI 助理</span></span>
              </div>
              <div className="pt-3 border-t border-white/10 mt-2">
                <div className="flex justify-between mb-1.5">
                  <span>本周目标</span>
                  <span className="text-indigo-300">80%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-[80%] rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Central Hero Typography */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto z-10"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold leading-[1.1] tracking-tight mb-8">
              <span className="block text-white">重塑认知。</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300">遇见更好的</span>
              <span className="block text-white">自己。</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
              基于认知行为疗法（CBT）的个性化 AI 心理支持，为您赋能，伴您前行。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold text-sm hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">开启心灵重塑之旅</span>
                <ChevronRight className="relative z-10 w-4 h-4" />
              </button>
            </div>
          </motion.div>

          {/* Floating Insights Card (Right) */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="hidden xl:block absolute right-0 top-[15%] w-[280px] bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl z-20"
          >
            <h3 className="text-sm font-medium text-white/80 mb-4">AI 情绪洞察</h3>
            <div className="mb-4">
              <div className="text-xs text-white/60 mb-1">情绪趋势：<span className="text-cyan-300">逐渐平稳</span></div>
              {/* Mock Chart Area */}
              <div className="h-16 mt-2 flex items-end gap-1">
                {[40, 30, 50, 45, 60, 55, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500/20 to-cyan-400/80 rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-2 rounded-lg">
              <ShieldCheck className="w-4 h-4" /> 今日情绪打卡已完成
            </div>
          </motion.div>

        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-lg py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4">为什么选择 RETHINK？</h2>
            <p className="text-white/50 max-w-2xl mx-auto">24/7 全天候在线，体验结合前沿 AI 分析与 CBT 疗法的专业心理支持。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] text-center hover:bg-white/[0.07] transition-colors">
              <div className="w-14 h-14 mx-auto bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Clock className="w-6 h-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold mb-3">24/7 全天候陪伴</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                您的 AI 伙伴时刻在线，在您需要时提供即时的情感支持与引导式的 CBT 练习。
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] text-center hover:bg-white/[0.07] transition-colors">
              <div className="w-14 h-14 mx-auto bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <Brain className="w-6 h-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-semibold mb-3">专业的 CBT 框架</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                基于经过临床验证的认知行为疗法原则，帮助您识别、挑战并重塑消极的思维模式。
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] text-center hover:bg-white/[0.07] transition-colors">
              <div className="w-14 h-14 mx-auto bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <ShieldCheck className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold mb-3">安全与绝对隐私</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                您的对话完全私密。我们采用企业级加密与隐私沙盒技术，严密保护您的数据安全。
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/40">
        <div className="max-w-7xl mx-auto px-6 flex justify-center">
          <p>© 2026 RETHINK. 保留所有权利。</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
