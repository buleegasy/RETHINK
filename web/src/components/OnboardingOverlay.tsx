import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, CloudLightning, CloudFog, Sun, Gamepad2, Anchor, Music, GraduationCap, Heart, User } from 'lucide-react';
import type { UserProfile } from '../types';

interface OnboardingOverlayProps {
  onComplete: (profile: UserProfile) => void;
}

const CARDS = [
  {
    id: 'weather',
    question: '你现在处于哪种天气？',
    options: [
      { id: 'Storm', label: '暴雨', icon: CloudRain, color: 'bg-blue-500' },
      { id: 'Thunder', label: '雷暴', icon: CloudLightning, color: 'bg-purple-600' },
      { id: 'Fog', label: '大雾', icon: CloudFog, color: 'bg-gray-400' },
      { id: 'Sunny', label: '晴天', icon: Sun, color: 'bg-yellow-400' },
    ]
  },
  {
    id: 'safetyIsland',
    question: '如果现在可以逃跑，你想去哪里？',
    options: [
      { id: 'Arcade', label: '赛博电玩城', icon: Gamepad2, color: 'bg-pink-500' },
      { id: 'DeepSea', label: '宁静深海', icon: Anchor, color: 'bg-cyan-600' },
      { id: 'MusicFestival', label: '阳光音乐节', icon: Music, color: 'bg-orange-500' },
    ]
  },
  {
    id: 'stressor',
    question: '你在保护什么？',
    options: [
      { id: 'Academic', label: '我的成绩单', icon: GraduationCap, color: 'bg-indigo-500' },
      { id: 'SelfEsteem', label: '我的自尊心', icon: User, color: 'bg-emerald-500' },
      { id: 'Relationship', label: '我与某人的关系', icon: Heart, color: 'bg-rose-500' },
    ]
  }
];

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  const handleSelect = (id: string) => {
    const field = CARDS[step].id;
    const newProfile = { ...profile, [field]: id };
    setProfile(newProfile);

    if (step < CARDS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(newProfile as UserProfile);
    }
  };

  const currentCard = CARDS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center gap-2">
          {CARDS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="glass-panel p-8 rounded-[32px] text-center"
          >
            <h2 className="text-2xl font-semibold text-text-primary mb-8 tracking-tight">
              {currentCard.question}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {currentCard.options.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelect(opt.id)}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300 active:scale-[0.98]"
                  >
                    <div className={`w-12 h-12 rounded-xl ${opt.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={24} />
                    </div>
                    <span className="text-lg font-medium text-text-primary">{opt.label}</span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
        
        <p className="text-center text-white/40 text-sm mt-8 font-medium">
          只需 3 秒，开启你的专属疗愈空间
        </p>
      </div>
    </div>
  );
};
