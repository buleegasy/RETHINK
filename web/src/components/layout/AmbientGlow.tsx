/**
 * AmbientGlow — Gemini-style CSS Blob Aurora Background
 *
 * 4 large blurred blobs drift slowly via pure CSS @keyframes animations.
 * Each blob uses `transform: translate()` (100% GPU-composited) and
 * `filter: blur()` to create a soft, organic flowing light effect.
 *
 * No WebGL, no JS animation loop, no requestAnimationFrame.
 *
 * Color psychology (counter-regulation):
 *   Anxiety    → cool blues + mints (calming)
 *   Depression → warm amber + purple (energizing)
 *   Anger      → deep blues + cyans (cooling)
 *   Crisis     → forced calming blue-green
 */

import React, { useMemo, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import type { FSMState } from '../../types';

// ═══════════════════════════════════════════════════════════════
// Color Palettes (Color Psychology)
// ═══════════════════════════════════════════════════════════════

interface Palette {
  c1: string; // Trust Blue Hex
  c2: string; // Healing Mint / Cyan Hex
  c3: string; // Empathy Purple Hex
  c4: string; // Warm Pink/Rose Hex
  intensity: number;
  speed: number;
}

const FSM_PALETTES: Record<FSMState, Palette> = {
  Onboarding: {
    c1: 'var(--aura-calm-1)', c2: 'var(--aura-calm-2)', c3: 'var(--aura-calm-1)', c4: 'var(--aura-calm-2)',
    intensity: 1.0, speed: 0.12,
  },
  Active_Listening: {
    c1: 'var(--aura-calm-1)', c2: 'var(--aura-calm-2)', c3: 'var(--aura-calm-1)', c4: 'var(--aura-calm-2)',
    intensity: 1.0, speed: 0.08,
  },
  CBT_Stripping: {
    c1: 'var(--aura-calm-1)', c2: 'var(--aura-calm-2)', c3: 'var(--aura-calm-1)', c4: 'var(--aura-calm-2)',
    intensity: 1.0, speed: 0.10,
  },
  Socratic_Questioning: {
    c1: 'var(--aura-calm-1)', c2: 'var(--aura-calm-2)', c3: 'var(--aura-calm-1)', c4: 'var(--aura-calm-2)',
    intensity: 1.05, speed: 0.14,
  },
  Crisis_Escalation: {
    c1: 'var(--aura-cool-1)', c2: 'var(--aura-cool-2)', c3: 'var(--aura-cool-1)', c4: 'var(--aura-cool-2)',
    intensity: 0.9, speed: 0.05,
  },
};

function applyEmotionMod(base: Palette, emotion?: string): Palette {
  if (!emotion || emotion === 'Neutral') return base;
  const p = { ...base };

  switch (emotion) {
    case 'Anxiety':
    case 'Anger':
      // Cool aura for anxiety and anger (optical sedative)
      p.c1 = 'var(--aura-cool-1)';
      p.c2 = 'var(--aura-cool-2)';
      p.c3 = 'var(--aura-cool-1)';
      p.c4 = 'var(--aura-cool-2)';
      p.speed = Math.max(0.04, p.speed * 0.6); // slow down
      break;
    case 'Depression':
      // Warm aura for sadness (visual serotonin)
      p.c1 = 'var(--aura-warm-1)';
      p.c2 = 'var(--aura-warm-2)';
      p.c3 = 'var(--aura-warm-1)';
      p.c4 = 'var(--aura-warm-2)';
      p.intensity = Math.min(1.3, p.intensity * 1.15);
      p.speed = p.speed * 1.3; // gentle speed up
      break;
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════
// Blob configuration — positions & animation assignments (Localized to bottom)
// ═══════════════════════════════════════════════════════════════

const BLOB_CONFIG = [
  { bottom: '-15vh', left: '-5vw',  size: '50vw', animation: 'glow-flow-1', duration: '22s' },
  { bottom: '-20vh', left: '25vw',  size: '60vw', animation: 'glow-flow-2', duration: '26s' },
  { bottom: '-10vh', left: '55vw',  size: '55vw', animation: 'glow-flow-3', duration: '30s' },
  { bottom: '-25vh', left: '75vw',  size: '45vw', animation: 'glow-flow-4', duration: '28s' },
];

// ═══════════════════════════════════════════════════════════════
// Blob Layer — renders 4 blurred, drifting color blobs
// ═══════════════════════════════════════════════════════════════

interface BlobLayerProps {
  palette: Palette;
  opacity: number;
  testId: string;
}

const BlobLayer: React.FC<BlobLayerProps> = React.memo(({ palette, opacity, testId }) => {
  const colors = [palette.c1, palette.c2, palette.c3, palette.c4];

  return (
    <div
      className="absolute inset-x-0 bottom-0 top-1/2 transition-opacity duration-[3000ms] ease-in-out pointer-events-none"
      style={{ opacity }}
      data-testid={testId}
    >
      {BLOB_CONFIG.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: blob.bottom,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            borderRadius: '50%',
            backgroundColor: colors[i],
            filter: 'blur(140px)', // updated to 140px per spec
            opacity: 1, // updated to 1 per spec since colors have alpha
            animation: `${blob.animation} ${blob.duration} ease-in-out infinite`,
            willChange: 'transform',
            transition: 'background-color var(--duration-mood-shift) var(--ease-mindful)',

          }}
        />
      ))}
    </div>
  );
});

BlobLayer.displayName = 'BlobLayer';

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export const AmbientGlow: React.FC = () => {
  const fsmState   = useChatStore(state => state.fsmState);
  const messages   = useChatStore(state => state.messages);
  const isStreaming = useChatStore(state => state.isStreaming);

  // Extract latest emotion from AI response
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

  const palette = useMemo(() => {
    if (riskLevel === 'crisis' || fsmState === 'Crisis_Escalation') {
      return FSM_PALETTES.Crisis_Escalation;
    }
    const base = FSM_PALETTES[fsmState as FSMState] ?? FSM_PALETTES.Onboarding;
    const result = applyEmotionMod(base, emotion);
    // Streaming boost
    if (isStreaming) {
      return { ...result, intensity: Math.min(1.0, result.intensity * 1.15), speed: result.speed * 1.3 };
    }
    return result;
  }, [fsmState, emotion, riskLevel, isStreaming]);

  // Double-layer opacity cross-fade state
  const [layerState, setLayerState] = useState({
    active: 'A' as 'A' | 'B',
    paletteA: palette,
    paletteB: palette,
    prevPalette: palette,
  });

  // Adjust state during render if palette changes to avoid useEffect setState lints
  if (
    palette.c1 !== layerState.prevPalette.c1 ||
    palette.c2 !== layerState.prevPalette.c2 ||
    palette.c3 !== layerState.prevPalette.c3 ||
    palette.c4 !== layerState.prevPalette.c4
  ) {
    const nextActive = layerState.active === 'A' ? 'B' : 'A';
    setLayerState({
      active: nextActive,
      paletteA: nextActive === 'A' ? palette : layerState.paletteA,
      paletteB: nextActive === 'B' ? palette : layerState.paletteB,
      prevPalette: palette,
    });
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        isolation: 'isolate',
        opacity: isStreaming ? 0.7 : 0.5,
        transition: 'opacity 1000ms ease-in-out',
      }}
      data-testid="ambient-glow-container"
    >
      <BlobLayer
        palette={layerState.paletteA}
        opacity={layerState.active === 'A' ? 1 : 0}
        testId="glow-layer-a"
      />
      <BlobLayer
        palette={layerState.paletteB}
        opacity={layerState.active === 'B' ? 1 : 0}
        testId="glow-layer-b"
      />
    </div>
  );
};
