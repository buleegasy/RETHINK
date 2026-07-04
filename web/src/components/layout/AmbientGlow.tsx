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
    c1: '#5C94FF', // Bright Cornflower Blue
    c2: '#24E0D1', // Bright Turquoise
    c3: '#B388FF', // Soft Lavender
    c4: '#FF8CA8', // Soft Rose
    intensity: 1.1,
    speed: 0.12,
  },
  Active_Listening: {
    c1: '#6B8AFF', // Empathy Blue
    c2: '#4AE5FF', // Soft Cyan
    c3: '#D088FF', // Bright Empathy Purple
    c4: '#FF7EB3', // Warm Pink
    intensity: 1.0,
    speed: 0.08,
  },
  CBT_Stripping: {
    c1: '#2979FF', // Clear Analytical Blue
    c2: '#00E5FF', // Bright Cyan
    c3: '#7C4DFF', // Deep Purple
    c4: '#00B0FF', // Light Blue
    intensity: 1.0,
    speed: 0.10,
  },
  Socratic_Questioning: {
    c1: '#00B8D4', // Exploration Cyan
    c2: '#1DE9B6', // Fresh Mint
    c3: '#8C9EFF', // Insight Indigo
    c4: '#00E676', // Bright Green
    intensity: 1.05,
    speed: 0.14,
  },
  Crisis_Escalation: {
    c1: '#0D47A1', // Deep Safe Blue
    c2: '#006064', // Deep Teal
    c3: '#1A237E', // Dark Indigo
    c4: '#004D40', // Dark Green
    intensity: 0.9,
    speed: 0.05,
  },
};

function applyEmotionMod(base: Palette, emotion?: string): Palette {
  if (!emotion || emotion === 'Neutral') return base;
  const p = { ...base };

  switch (emotion) {
    case 'Anxiety':
      p.c2 = '#00E5FF'; // Cyan
      p.c1 = '#2979FF'; // Blue
      p.c4 = '#1DE9B6'; // Mint
      p.c3 = '#536DFE'; // Indigo
      p.speed = Math.max(0.04, p.speed * 0.6); // slow down
      break;
    case 'Depression':
      p.c4 = '#FF4081'; // Vibrant Pink
      p.c3 = '#E040FB'; // Bright Purple
      p.c1 = '#7C4DFF'; // Deep Purple
      p.c2 = '#FF80AB'; // Light Pink
      p.intensity = Math.min(1.3, p.intensity * 1.15);
      p.speed = p.speed * 1.3; // gentle speed up
      break;
    case 'Anger':
      p.c1 = '#01579B'; 
      p.c2 = '#006064'; 
      p.c4 = '#004D40'; 
      p.c3 = '#1A237E'; 
      p.speed = Math.max(0.04, p.speed * 0.5); // very slow
      break;
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════
// Blob configuration — positions & animation assignments
// ═══════════════════════════════════════════════════════════════

const BLOB_CONFIG = [
  { top: '5%',  left: '10%', size: '55vmax', animation: 'glow-drift-1', duration: '22s' },
  { top: '10%', left: '55%', size: '50vmax', animation: 'glow-drift-2', duration: '26s' },
  { top: '50%', left: '5%',  size: '48vmax', animation: 'glow-drift-3', duration: '30s' },
  { top: '45%', left: '50%', size: '52vmax', animation: 'glow-drift-4', duration: '28s' },
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
      className="absolute inset-0 transition-opacity duration-[3000ms] ease-in-out"
      style={{ opacity }}
      data-testid={testId}
    >
      {BLOB_CONFIG.map((blob, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: blob.top,
            left: blob.left,
            width: blob.size,
            height: blob.size,
            borderRadius: '50%',
            backgroundColor: colors[i],
            filter: 'blur(100px)',
            opacity: 0.7,
            animation: `${blob.animation} ${blob.duration} ease-in-out infinite`,
            willChange: 'transform',
            transition: 'background-color 3s ease-in-out',
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
        opacity: isStreaming ? 0.85 : 0.6,
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
