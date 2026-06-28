/**
 * AmbientGlow — 背景环境光晕
 *
 * 色彩心理学设计：
 *  • 蓝色  (#4285F4) — 信任、平静、专业感，心理支持的核心锚点
 *  • 薄荷绿 (#00C9A7) — 治愈、希望、生命力，对抗焦虑与低落
 *  • 柔紫  (#9C6FDE) — 感性、内省、情绪释放，促进深层共情
 *  • 暖琥珀 (#FF9F5A，极淡) — 温暖与被接纳感，防止冷色调疏离
 *
 * 性能保证：
 *  • 纯 CSS @keyframes + will-change: transform → GPU 合成线程，零 JS 占用
 *  • 与 React 渲染周期完全解耦，不监听任何 store
 *  • prefers-reduced-motion 媒体查询自动暂停动画
 */

import React from 'react';

export const AmbientGlow: React.FC = () => (
  <div
    aria-hidden="true"
    className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
    style={{ isolation: 'isolate' }}
  >
    {/* ── Orb 1: 信任蓝 — 左上锚点，主导平静感 ── */}
    <div className="ambient-orb ambient-orb--blue" />

    {/* ── Orb 2: 治愈绿 — 右下，给予希望与出口感 ── */}
    <div className="ambient-orb ambient-orb--mint" />

    {/* ── Orb 3: 柔紫 — 中央偏右，促进内省与情感流动 ── */}
    <div className="ambient-orb ambient-orb--purple" />

    {/* ── Orb 4: 暖琥珀 — 底部中心，极淡，提供温暖底色 ── */}
    <div className="ambient-orb ambient-orb--amber" />
  </div>
);
