import React from 'react';

const HOTLINES = [
  { name: '全国心理援助热线', number: '12355', desc: '共青团中央设立的免费青少年心理咨询和维权热线' },
  { name: '希望24小时热线', number: '400-161-9995', desc: '生命教育与危机干预24小时免费热线' },
  { name: '北京心理危机研究与干预中心', number: '010-82951332', desc: '24小时心理援助热线' },
];

export const CrisisOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface p-6 sm:p-10 animate-fade-in text-center overflow-y-auto">
      <div className="max-w-2xl mx-auto flex flex-col items-center">
        <div className="mb-8 w-24 h-24 rounded-full bg-error-container/20 flex items-center justify-center animate-pulse-gentle">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-on-surface mb-6 leading-snug">
          世界或许偶尔冰冷，但请相信，<br className="hidden sm:block"/>
          <span className="text-gemini-blue font-bold">总有人愿意紧紧拥抱你。</span>
        </h1>
        
        <p className="text-lg text-on-surface-variant mb-12 max-w-xl leading-relaxed">
          我们检测到您当前可能正经历着难以承受的痛苦。系统出于对您生命安全的最高关切，已暂时停止 AI 疏导。您不需要独自面对黑夜，请立刻拨打下方专业的生命援助热线，他们 24 小时都在等您的电话：
        </p>
        
        <div className="w-full flex flex-col gap-4 mb-12">
          {HOTLINES.map((hotline, idx) => (
            <div key={idx} className="bg-surface-container-high rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between shadow-sm border border-outline-variant/30">
              <div className="text-center sm:text-left mb-3 sm:mb-0">
                <h3 className="text-lg font-bold text-on-surface mb-1">{hotline.name}</h3>
                <p className="text-sm text-on-surface-variant">{hotline.desc}</p>
              </div>
              <a href={`tel:${hotline.number}`} className="bg-gemini-blue text-white px-6 py-3 rounded-full font-medium hover:bg-gemini-blue-hover hover:scale-105 active:scale-95 transition-all shadow-md shrink-0 flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {hotline.number}
              </a>
            </div>
          ))}
        </div>

        <p className="text-sm text-on-surface-variant/70 italic">
          您的生命比一切都重要，请给自己一个被接住的机会。
        </p>
      </div>
    </div>
  );
};
