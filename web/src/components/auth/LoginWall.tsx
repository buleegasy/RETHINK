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
          className="absolute top-[-10%] left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
            filter: 'blur(90px)',
          }}
          animate={{ x: [0, 100, -50, 0], y: [0, -50, 50, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[-10%] right-[5%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(6, 182, 212, 0) 70%)',
            filter: 'blur(90px)',
          }}
          animate={{ x: [0, -80, 60, 0], y: [0, 50, -40, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.10) 0%, rgba(168, 85, 247, 0) 70%)',
            filter: 'blur(80px)',
          }}
          animate={{ x: [0, 50, -50, 0], y: [0, 50, -50, 0], scale: [1, 1.2, 0.8, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ReThinkLogo />
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <a href="#" className="hover:text-white transition-colors">Services</a>
          <a href="#" className="hover:text-white transition-colors">Therapists</a>
          <a href="#" className="hover:text-white transition-colors">Journal</a>
          <a href="#" className="hover:text-white transition-colors">Pricing</a>
        </nav>
        <button 
          onClick={() => setIsLoginModalOpen(true)}
          className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-medium transition-all backdrop-blur-md"
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 mt-12 md:mt-24 mb-32">
        
        {/* Floating Progress Card (Left) */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="hidden lg:block absolute left-[5%] top-[20%] w-[260px] bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl"
        >
          <h3 className="text-sm font-medium text-white/80 mb-4">Your Progress</h3>
          <div className="space-y-3 text-xs text-white/60">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center"><Clock className="w-3 h-3 text-indigo-300" /></div>
              <span>Session 8: <span className="text-white">Resilience</span></span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center"><Brain className="w-3 h-3 text-cyan-300" /></div>
              <span>Therapist: <span className="text-white">AI Agent</span></span>
            </div>
            <div className="pt-3 border-t border-white/10 mt-2">
              <div className="flex justify-between mb-1.5">
                <span>Weekly Goal</span>
                <span className="text-indigo-300">80%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 w-[80%] rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Floating Insights Card (Right) */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          className="hidden lg:block absolute right-[5%] top-[15%] w-[280px] bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-2xl"
        >
          <h3 className="text-sm font-medium text-white/80 mb-4">AI-Powered Insights</h3>
          <div className="mb-4">
            <div className="text-xs text-white/60 mb-1">Mood Trend: <span className="text-cyan-300">Stabilizing</span></div>
            {/* Mock Chart Area */}
            <div className="h-16 mt-2 flex items-end gap-1">
              {[40, 30, 50, 45, 60, 55, 70].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500/20 to-cyan-400/80 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-white/40 mt-1">
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-2 rounded-lg">
            <ShieldCheck className="w-4 h-4" /> Daily Check-in completed
          </div>
        </motion.div>

        {/* Central Hero Typography */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto"
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.1] tracking-tight mb-8">
            <span className="block text-white">RETHINK.</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-cyan-300">RECONNECT.</span>
            <span className="block text-white">RESTORE.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
            Empowering your journey with personalized, AI-driven mental health counseling based on Cognitive Behavioral Therapy (CBT).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold text-sm hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">Get Started Now</span>
              <ChevronRight className="relative z-10 w-4 h-4" />
            </button>
            <button className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full font-medium text-sm transition-all backdrop-blur-md">
              Learn More
            </button>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 border-t border-white/5 bg-black/20 backdrop-blur-lg py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4">Why RETHINK AI Counseling?</h2>
            <p className="text-white/50 max-w-2xl mx-auto">Experience personalized care with advanced AI analysis and CBT methodologies. Available 24/7.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] text-center hover:bg-white/[0.07] transition-colors">
              <div className="w-14 h-14 mx-auto bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Clock className="w-6 h-6 text-indigo-300" />
              </div>
              <h3 className="text-lg font-semibold mb-3">24/7 AI Support</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Your AI companion is always available, providing immediate emotional support and guided CBT exercises whenever you need them.
              </p>
            </div>
            
            <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] text-center hover:bg-white/[0.07] transition-colors">
              <div className="w-14 h-14 mx-auto bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                <Brain className="w-6 h-6 text-cyan-300" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Expert CBT Framework</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Built on proven Cognitive Behavioral Therapy principles, helping you identify, challenge, and restructure negative thought patterns.
              </p>
            </div>

            <div className="bg-white/5 border border-white/5 p-8 rounded-[32px] text-center hover:bg-white/[0.07] transition-colors">
              <div className="w-14 h-14 mx-auto bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <ShieldCheck className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold mb-3">Secure & Confidential</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Your conversations are completely private. We employ enterprise-grade encryption and privacy sandboxing to protect your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <a href="#" className="hover:text-white transition-colors">Services</a>
            <a href="#" className="hover:text-white transition-colors">Therapists</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">Resources</a>
          </div>
          <p>© 2026 RETHINK. All Rights Reserved.</p>
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
