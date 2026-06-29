/**
 * AmbientGlow — Gemini-style WebGL Aurora Shader Background
 *
 * Uses Three.js + @react-three/fiber for a fluid, organic aurora effect
 * driven by simplex noise in a fragment shader.
 *
 * Dynamic response:
 *   FSM State + intentEmotion → uniform color stops sent to GPU
 *   All color blending happens on the GPU — zero CPU overhead per frame.
 *
 * Color psychology (counter-regulation):
 *   Anxiety    → cool blues + mints (calming)
 *   Depression → warm amber + purple (energizing)
 *   Anger      → deep blues + cyans (cooling)
 *   Crisis     → forced calming blue-green
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useChatStore } from '../../store/chatStore';
import type { FSMState } from '../../types';

// Shaders are defined inline in AuroraMesh component


// ═══════════════════════════════════════════════════════════════
// Color Palettes (Color Psychology)
// ═══════════════════════════════════════════════════════════════

interface Palette {
  c1: [number, number, number]; // Trust Blue
  c2: [number, number, number]; // Healing Mint / Cyan
  c3: [number, number, number]; // Empathy Purple
  c4: [number, number, number]; // Warm Pink/Rose (Replaces Amber to prevent muddy brown blending)
  intensity: number;
  speed: number;
}

const hex2rgb = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
};

const FSM_PALETTES: Record<FSMState, Palette> = {
  Onboarding: {
    c1: hex2rgb('#5C94FF'), // Bright Cornflower Blue
    c2: hex2rgb('#24E0D1'), // Bright Turquoise
    c3: hex2rgb('#B388FF'), // Soft Lavender
    c4: hex2rgb('#FF8CA8'), // Soft Rose (replaces Amber for analogous harmony)
    intensity: 1.1,
    speed: 0.12,
  },
  Active_Listening: {
    c1: hex2rgb('#6B8AFF'), // Empathy Blue
    c2: hex2rgb('#4AE5FF'), // Soft Cyan
    c3: hex2rgb('#D088FF'), // Bright Empathy Purple
    c4: hex2rgb('#FF7EB3'), // Warm Pink
    intensity: 1.0,
    speed: 0.08,
  },
  CBT_Stripping: {
    c1: hex2rgb('#2979FF'), // Clear Analytical Blue
    c2: hex2rgb('#00E5FF'), // Bright Cyan
    c3: hex2rgb('#7C4DFF'), // Deep Purple
    c4: hex2rgb('#00B0FF'), // Light Blue
    intensity: 1.0,
    speed: 0.10,
  },
  Socratic_Questioning: {
    c1: hex2rgb('#00B8D4'), // Exploration Cyan
    c2: hex2rgb('#1DE9B6'), // Fresh Mint
    c3: hex2rgb('#8C9EFF'), // Insight Indigo
    c4: hex2rgb('#00E676'), // Bright Green
    intensity: 1.05,
    speed: 0.14,
  },
  Crisis_Escalation: {
    c1: hex2rgb('#0D47A1'), // Deep Safe Blue
    c2: hex2rgb('#006064'), // Deep Teal
    c3: hex2rgb('#1A237E'), // Dark Indigo
    c4: hex2rgb('#004D40'), // Dark Green
    intensity: 0.9,
    speed: 0.05,
  },
};

function applyEmotionMod(base: Palette, emotion?: string): Palette {
  if (!emotion || emotion === 'Neutral') return base;
  const p = { ...base, c1: [...base.c1] as [number,number,number], c2: [...base.c2] as [number,number,number], c3: [...base.c3] as [number,number,number], c4: [...base.c4] as [number,number,number] };

  switch (emotion) {
    case 'Anxiety':
      // Push cooling colors, suppress warm completely
      p.c2 = hex2rgb('#00E5FF'); // Cyan
      p.c1 = hex2rgb('#2979FF'); // Blue
      p.c4 = hex2rgb('#1DE9B6'); // Mint
      p.c3 = hex2rgb('#536DFE'); // Indigo
      p.speed = Math.max(0.04, p.speed * 0.6); // slow down
      break;
    case 'Depression':
      // Push warm, activating, radiant pinks/purples
      p.c4 = hex2rgb('#FF4081'); // Vibrant Pink
      p.c3 = hex2rgb('#E040FB'); // Bright Purple
      p.c1 = hex2rgb('#7C4DFF'); // Deep Purple
      p.c2 = hex2rgb('#FF80AB'); // Light Pink
      p.intensity = Math.min(1.3, p.intensity * 1.15);
      p.speed = p.speed * 1.3; // gentle speed up
      break;
    case 'Anger':
      // Maximum cooling, deep ocean colors
      p.c1 = hex2rgb('#01579B'); 
      p.c2 = hex2rgb('#006064'); 
      p.c4 = hex2rgb('#004D40'); 
      p.c3 = hex2rgb('#1A237E'); 
      p.speed = Math.max(0.04, p.speed * 0.5); // very slow
      break;
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════
// WebGL Aurora Mesh
// ═══════════════════════════════════════════════════════════════

const AuroraMesh: React.FC<{ palette: Palette }> = ({ palette }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  // Pre-allocated THREE.Color target instances for GC optimization
  const targetColors = useRef([
    new THREE.Color(),
    new THREE.Color(),
    new THREE.Color(),
    new THREE.Color(),
  ]);

  const uniforms = useRef({
    uTime: { value: 0 },
    uSpeed: { value: palette.speed },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uColor1: { value: new THREE.Color(...palette.c1) },
    uColor2: { value: new THREE.Color(...palette.c2) },
    uColor3: { value: new THREE.Color(...palette.c3) },
    uColor4: { value: new THREE.Color(...palette.c4) },
    uIntensity: { value: palette.intensity },
  });

  useFrame((_, delta) => {
    const u = uniforms.current;
    u.uTime.value += delta;
    u.uResolution.value.set(size.width, size.height);

    // Damped interpolation factor for inertia
    const lerpFactor = 1 - Math.pow(0.15, delta);

    // Smooth color transitions (~3s ease) using pre-allocated color instances
    const tc = targetColors.current;
    tc[0].setRGB(...palette.c1);
    tc[1].setRGB(...palette.c2);
    tc[2].setRGB(...palette.c3);
    tc[3].setRGB(...palette.c4);
    u.uColor1.value.lerp(tc[0], lerpFactor);
    u.uColor2.value.lerp(tc[1], lerpFactor);
    u.uColor3.value.lerp(tc[2], lerpFactor);
    u.uColor4.value.lerp(tc[3], lerpFactor);
    
    // Smoothly interpolate scalar variables
    u.uIntensity.value += (palette.intensity - u.uIntensity.value) * lerpFactor;
    u.uSpeed.value += (palette.speed - u.uSpeed.value) * lerpFactor;
  });

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`,
        fragmentShader: `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uIntensity;

// Extremely low frequency noise for subtle mesh breathing
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                 + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
               dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  
  float t = uTime * uSpeed * 0.4;

  // 1. Subtle global breathing (no chaotic domain warp, just a gentle wave)
  vec2 wobble = vec2(
    snoise(p * 0.8 + vec2(t * 0.5, t * 0.2)),
    snoise(p * 0.8 - vec2(t * 0.3, -t * 0.4))
  ) * 0.12;
  
  vec2 w = p + wobble;

  // 3. Dynamic Orbital Orbs (Lissajous curves for organic, non-repeating flow)
  // These act as huge, soft spotlights of color
  vec2 pos1 = vec2(sin(t * 0.8) * 0.6, cos(t * 0.5) * 0.4);
  vec2 pos2 = vec2(cos(t * 0.6) * 0.5, sin(t * 0.9) * 0.5);
  vec2 pos3 = vec2(sin(t * 0.4 + 2.0) * 0.7, cos(t * 0.7 + 1.0) * 0.3);
  vec2 pos4 = vec2(cos(t * 0.7 + 3.0) * 0.4, sin(t * 0.5 + 2.5) * 0.6);

  // 4. Gaussian Falloff for silky smooth blending
  // Using exponential curve rather than smoothstep avoids hard edges
  float d1 = length(w - pos1);
  float d2 = length(w - pos2);
  float d3 = length(w - pos3);
  float d4 = length(w - pos4);

  float spread = 1.3; // Controls how wide and blurred the orbs are
  float w1 = exp(-d1 * d1 * spread);
  float w2 = exp(-d2 * d2 * spread);
  float w3 = exp(-d3 * d3 * spread);
  float w4 = exp(-d4 * d4 * spread);

  // 5. Normalized Blending to preserve pure curated Hex colors
  // Adding a base value to wSum prevents dark dead-zones
  float wSum = w1 + w2 + w3 + w4 + 0.15;
  vec3 col = (uColor1 * w1 + uColor2 * w2 + uColor3 * w3 + uColor4 * w4) / wSum;

  // Global Intensity
  col *= uIntensity;

  // 6. Micro-grain for premium anti-banding (imperceptible as noise)
  float noise = fract(sin(dot(uv + t, vec2(12.9898, 78.233))) * 43758.5453);
  col += (noise - 0.5) * 0.006;

  gl_FragColor = vec4(col, 1.0);
}`,
        // eslint-disable-next-line react-hooks/refs
        uniforms: uniforms.current,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

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

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
      style={{ isolation: 'isolate' }}
    >
      <Canvas
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        style={{ width: '100%', height: '100%' }}
        frameloop="always"
      >
        <AuroraMesh palette={palette} />
      </Canvas>
    </div>
  );
};
