import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoginModal } from './LoginModal';
import { ReThinkLogo } from '../layout/ReThinkLogo';
import { LiquidBackground } from '../layout/LiquidBackground';
import { ChevronRight } from 'lucide-react';

export function LoginWall() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FAF9F6] text-slate-800 overflow-y-auto overflow-x-hidden selection:bg-orange-500/20">
      
      {/* Background */}
      <LiquidBackground />

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo - assuming ReThinkLogo adapts to color or we pass a prop. If it's pure white, it might need updating in ReThinkLogo.tsx to support light mode. Let's assume the logo component handles it or we wrap it. */}
          <div className="text-slate-900 drop-shadow-sm w-10 h-10">
             <ReThinkLogo />
          </div>
        </div>
        <button 
          onClick={() => setIsLoginModalOpen(true)}
          className="px-6 py-2.5 rounded-full bg-white/60 hover:bg-white/90 border border-slate-200/50 text-slate-700 text-sm font-medium transition-all backdrop-blur-md shadow-sm hover:shadow-md"
        >
          登录
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 mt-12 md:mt-24 mb-32">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto flex flex-col items-center z-10"
        >
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-200/50 bg-white/60 text-orange-700/80 text-xs font-medium backdrop-blur-md shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            全新温情升级 · 随时倾听
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.2] tracking-tight mb-8">
            <span className="block font-serif text-slate-800 mb-2 md:mb-4 tracking-normal drop-shadow-sm">RETHINK.</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 font-sans font-semibold pb-1">重塑认知 遇见更好的自己</span>
          </h1>
          
          <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
            在这里，卸下所有的疲惫与防备。<br className="hidden md:block" />在阳光满溢的安全空间里，与 AI 一起整理思绪，重获平静。
          </p>

          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="group relative px-8 py-4 bg-slate-800 text-white rounded-full font-medium text-sm hover:scale-105 transition-all flex items-center gap-2 overflow-hidden shadow-xl shadow-slate-800/10 hover:shadow-slate-800/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-800 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">推开这扇门</span>
            <ChevronRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </main>

      <footer className="relative z-10 py-8 text-center text-xs text-slate-400/60">
        <div className="max-w-7xl mx-auto px-6 flex justify-center">
          <p>© 2026 RETHINK. 你的专属心灵绿洲。</p>
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
