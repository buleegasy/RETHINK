import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoginModal } from './LoginModal';
import { ReThinkLogo } from '../layout/ReThinkLogo';
import { ParticleBackground } from '../layout/ParticleBackground';
import { ChevronRight } from 'lucide-react';

export function LoginWall() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#030712] text-white overflow-y-auto overflow-x-hidden selection:bg-indigo-500/30">
      
      {/* Absolute Ambient Background - Minimalist Horizon Style + Particles */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden z-0 flex flex-col justify-center items-center">
        {/* Interactive Particle Background */}
        <ParticleBackground />

        {/* Deep blue horizon glow (pointer-events-none so it doesn't block particles) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[80vh] max-h-[800px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-600/20 via-slate-900/10 to-transparent blur-[100px] pointer-events-none" />
        
        {/* Subtle grid pattern overlay for texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_10%,transparent_80%)] pointer-events-none" />
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
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto flex flex-col items-center z-10"
        >
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-medium backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI Agent 2.0 已上线
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-[1.2] tracking-tight mb-8">
            <span className="block font-serif text-white mb-2 md:mb-4 tracking-normal">RETHINK.</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 font-sans font-semibold">重塑认知 遇见更好的自己</span>
          </h1>
          
          <p className="text-base md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
            基于认知行为疗法（CBT）的专属 AI 心理支持平台。<br className="hidden md:block" />24/7 全天候倾听您的心声，为您赋能。
          </p>

          <button 
            onClick={() => setIsLoginModalOpen(true)}
            className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold text-sm hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative z-10">开启心灵重塑之旅</span>
            <ChevronRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </main>

      <footer className="relative z-10 py-8 text-center text-xs text-white/30">
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
