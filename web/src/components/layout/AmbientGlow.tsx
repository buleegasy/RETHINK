/**
 * AmbientGlow — 动态色彩心理学背景光晕
 *
 * 响应逻辑：
 *  1. FSM 状态    → 决定主色调（治疗阶段视觉场）
 *  2. intentEmotion → 情绪「反调节」（对抗而非镜像）
 *     Anxiety    → 强化 mint/蓝（镇静），撤回 amber
 *     Depression → 推高 amber/暖（激活能量），暖紫给予认可
 *     Anger      → 推高冷蓝/青，撤回一切暖色
 *  3. riskLevel   → crisis 时全切蓝绿安抚色，清除刺激色
 *
 * 性能保证：
 *  • framer-motion animate 对 rgba 做原生插值，无 JS 逐帧计算
 *  • will-change: transform + filter → GPU 合成线程
 *  • prefers-reduced-motion → 自动静止
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useChatStore } from '../../store/chatStore';
import type { FSMState } from '../../types';

// ── 色彩意义 ──────────────────────────────────────────────────
//  蓝   #4285F4  信任 / 稳定 / 专业    → 心理安全感锚点
//  薄荷绿 #00C9A7  治愈 / 希望 / 再生    → 缓解焦虑
//  柔紫  #9C6FDE  感性 / 共情 / 内省    → 情感自由流动
//  暖琥珀 #FF9F5A  温暖 / 被接纳        → 防疏离感
// ─────────────────────────────────────────────────────────────

interface OrbColors {
  blue:   [number, number, number, number]; // [r, g, b, a]
  mint:   [number, number, number, number];
  purple: [number, number, number, number];
  amber:  [number, number, number, number];
}

/** FSM 阶段基础色盘 */
const FSM_PALETTES: Record<FSMState, OrbColors> = {
  Onboarding: {
    blue:   [66, 133, 244, 0.30],
    mint:   [0, 201, 167, 0.18],
    purple: [156, 111, 222, 0.14],
    amber:  [255, 159, 90, 0.28],  // 欢迎暖意主导
  },
  Active_Listening: {
    blue:   [66, 133, 244, 0.20],
    mint:   [0, 201, 167, 0.20],
    purple: [156, 111, 222, 0.42], // 共情紫 dominant
    amber:  [255, 159, 90, 0.24],
  },
  CBT_Stripping: {
    blue:   [66, 133, 244, 0.44], // 分析蓝 dominant
    mint:   [0, 201, 167, 0.28],
    purple: [156, 111, 222, 0.14],
    amber:  [255, 159, 90, 0.10],
  },
  Socratic_Questioning: {
    blue:   [30, 190, 220, 0.36],  // 探索青 dominant
    mint:   [0, 201, 167, 0.36],
    purple: [156, 111, 222, 0.24],
    amber:  [255, 159, 90, 0.10],
  },
  Crisis_Escalation: {
    blue:   [26, 115, 232, 0.55],  // 深安抚蓝，强力镇静
    mint:   [0, 201, 167, 0.44],
    purple: [156, 111, 222, 0.06],
    amber:  [255, 159, 90, 0.03],  // 危机时撤回一切刺激暖色
  },
};

const DEFAULT_PALETTE: OrbColors = {
  blue:   [66, 133, 244, 0.38],
  mint:   [0, 201, 167, 0.32],
  purple: [156, 111, 222, 0.28],
  amber:  [255, 159, 90, 0.16],
};

/** 情绪「反调节」修正：对抗情绪，而非镜像情绪 */
function applyEmotionMod(base: OrbColors, emotion?: string): OrbColors {
  if (!emotion || emotion === 'Neutral') return base;
  const p: OrbColors = {
    blue:   [...base.blue]   as [number, number, number, number],
    mint:   [...base.mint]   as [number, number, number, number],
    purple: [...base.purple] as [number, number, number, number],
    amber:  [...base.amber]  as [number, number, number, number],
  };

  const clamp = (v: number) => Math.min(0.70, Math.max(0, v));

  switch (emotion) {
    case 'Anxiety':
      // 焦虑 → 强镇静：推高蓝/绿，压低刺激暖色
      p.mint[3]   = clamp(p.mint[3]   * 1.55);
      p.blue[3]   = clamp(p.blue[3]   * 1.40);
      p.amber[3]  = clamp(p.amber[3]  * 0.35);
      p.purple[3] = clamp(p.purple[3] * 0.85);
      break;
    case 'Depression':
      // 抑郁 → 激活能量：推高暖琥珀，共情紫给予认可感
      p.amber[3]  = clamp(p.amber[3]  * 2.40);
      p.purple[3] = clamp(p.purple[3] * 1.50);
      p.mint[3]   = clamp(p.mint[3]   * 0.70);
      break;
    case 'Anger':
      // 愤怒 → 冷却调节：推高蓝/绿冷色，移除暖色
      p.blue[3]   = clamp(p.blue[3]   * 1.60);
      p.mint[3]   = clamp(p.mint[3]   * 1.45);
      p.amber[3]  = clamp(p.amber[3]  * 0.20);
      p.purple[3] = clamp(p.purple[3] * 0.60);
      break;
  }
  return p;
}

function toRgba([r, g, b, a]: [number, number, number, number]) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function makeRadial(color: [number, number, number, number], cx: string, cy: string) {
  const [r, g, b, a] = color;
  return `radial-gradient(circle at ${cx} ${cy}, rgba(${r},${g},${b},${a}) 0%, rgba(${r},${g},${b},${a * 0.3}) 40%, transparent 70%)`;
}

export const AmbientGlow: React.FC = () => {
  const fsmState   = useChatStore(state => state.fsmState);
  const messages   = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);

  // 从最近一条 AI 消息的 techChain 中读取情绪信号
  const lastTechChain = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].techChain) {
        return messages[i].techChain;
      }
    }
    return null;
  }, [messages]);

  const emotion   = lastTechChain?.intentEmotion;
  const riskLevel = lastTechChain?.riskLevel;

  // 计算最终色盘
  const palette = useMemo(() => {
    // 危机模式：强制安抚色盘，忽略情绪修正
    if (riskLevel === 'crisis' || fsmState === 'Crisis_Escalation') {
      return FSM_PALETTES.Crisis_Escalation;
    }
    const base = FSM_PALETTES[fsmState as FSMState] ?? DEFAULT_PALETTE;
    return applyEmotionMod(base, emotion);
  }, [fsmState, emotion, riskLevel]);

  // streaming 时轻微放大振幅，增加"AI 正在思考"的视觉存在感
  const streamingBoost = isStreaming ? 1.20 : 1.0;

  const boosted = useMemo<OrbColors>(() => ({
    blue:   [...palette.blue.slice(0,3), Math.min(0.70, palette.blue[3]   * streamingBoost)] as [number,number,number,number],
    mint:   [...palette.mint.slice(0,3), Math.min(0.70, palette.mint[3]   * streamingBoost)] as [number,number,number,number],
    purple: [...palette.purple.slice(0,3), Math.min(0.70, palette.purple[3] * streamingBoost)] as [number,number,number,number],
    amber:  [...palette.amber.slice(0,3), Math.min(0.70, palette.amber[3]  * streamingBoost)] as [number,number,number,number],
  }), [palette, streamingBoost]);

  const transition = { duration: 3.5, ease: [0.4, 0, 0.2, 1] } as const;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* ── Orb 1: 信任蓝 — 左上 ── */}
      <motion.div
        className="ambient-orb"
        style={{ width: '70vmax', height: '70vmax', top: '-20%', left: '-15%' }}
        animate={{ background: makeRadial(boosted.blue, '40%', '40%') }}
        transition={transition}
      />

      {/* ── Orb 2: 治愈薄荷绿 — 右下 ── */}
      <motion.div
        className="ambient-orb"
        style={{ width: '65vmax', height: '65vmax', bottom: '-15%', right: '-10%' }}
        animate={{ background: makeRadial(boosted.mint, '60%', '60%') }}
        transition={transition}
      />

      {/* ── Orb 3: 共情柔紫 — 右侧中部 ── */}
      <motion.div
        className="ambient-orb"
        style={{ width: '55vmax', height: '55vmax', top: '20%', right: '5%' }}
        animate={{ background: makeRadial(boosted.purple, '50%', '50%') }}
        transition={transition}
      />

      {/* ── Orb 4: 温暖琥珀 — 底部 ── */}
      <motion.div
        className="ambient-orb"
        style={{ width: '50vmax', height: '50vmax', bottom: '0', left: '20%' }}
        animate={{ background: makeRadial(boosted.amber, '50%', '70%') }}
        transition={transition}
      />
    </div>
  );
};
