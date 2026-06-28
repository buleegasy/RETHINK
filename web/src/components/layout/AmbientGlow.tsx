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

// ═══════════════════════════════════════════════════════════════
// GLSL Shaders
// ═══════════════════════════════════════════════════════════════

const VERT = /*glsl*/ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAG = /*glsl*/ `
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

// ── Simplex 2D noise ──
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

// ── Fractal Brownian Motion (organic detail) ──
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * snoise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  float t = uTime * uSpeed;

  // ── Multi-layer aurora noise ──
  float n1 = fbm(p * 1.2 + vec2(t * 0.15, t * 0.08));
  float n2 = fbm(p * 0.8 + vec2(-t * 0.12, t * 0.1) + 10.0);
  float n3 = fbm(p * 1.6 + vec2(t * 0.07, -t * 0.14) + 20.0);
  float n4 = snoise(p * 0.5 + vec2(t * 0.05, t * 0.03) + 30.0);

  // ── Soft aurora bands ──
  float band1 = smoothstep(-0.2, 0.6, n1) * 0.65;
  float band2 = smoothstep(-0.1, 0.5, n2) * 0.55;
  float band3 = smoothstep(0.0, 0.7, n3) * 0.45;
  float band4 = smoothstep(-0.3, 0.4, n4) * 0.35;

  // ── Blend colors via aurora bands ──
  vec3 col = vec3(0.0);
  col += uColor1 * band1;
  col += uColor2 * band2;
  col += uColor3 * band3;
  col += uColor4 * band4;

  // ── Subtle vignette (darker edges) ──
  float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.8;
  col *= vignette;

  // ── Master intensity ──
  col *= uIntensity;

  // ── Subtle grain for premium texture ──
  float grain = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.015;

  fragColor = vec4(col, 1.0);
}
`;

// Prefix for WebGL2 if needed
const FRAG_FULL = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uIntensity;
` + FRAG.split('void main()').slice(-1)[0].replace('varying vec2 vUv;', '');

const VERT_300 = `#version 300 es
in vec3 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// ═══════════════════════════════════════════════════════════════
// Color Palettes (Color Psychology)
// ═══════════════════════════════════════════════════════════════

interface Palette {
  c1: [number, number, number]; // Trust Blue
  c2: [number, number, number]; // Healing Mint
  c3: [number, number, number]; // Empathy Purple
  c4: [number, number, number]; // Warm Amber
  intensity: number;
  speed: number;
}

const FSM_PALETTES: Record<FSMState, Palette> = {
  Onboarding: {
    c1: [0.26, 0.52, 0.96],   // #4285F4 trust blue
    c2: [0.00, 0.79, 0.65],   // #00C9A7 mint
    c3: [0.61, 0.44, 0.87],   // #9C6FDE purple
    c4: [1.00, 0.62, 0.35],   // #FF9F5A amber (warm welcome)
    intensity: 0.85,
    speed: 0.12,
  },
  Active_Listening: {
    c1: [0.20, 0.45, 0.88],   // softer blue
    c2: [0.00, 0.65, 0.55],   // deeper mint
    c3: [0.72, 0.48, 0.92],   // #B87AEB brighter purple (empathy)
    c4: [0.95, 0.55, 0.30],   // soft amber
    intensity: 0.80,
    speed: 0.08,              // slower = calming
  },
  CBT_Stripping: {
    c1: [0.26, 0.52, 0.96],   // clear blue (analytical)
    c2: [0.10, 0.82, 0.72],   // bright teal
    c3: [0.45, 0.35, 0.70],   // muted purple
    c4: [0.80, 0.50, 0.25],   // dim amber
    intensity: 0.90,
    speed: 0.10,
  },
  Socratic_Questioning: {
    c1: [0.12, 0.75, 0.86],   // exploration cyan
    c2: [0.00, 0.79, 0.65],   // fresh mint
    c3: [0.61, 0.44, 0.87],   // insight purple
    c4: [0.60, 0.40, 0.20],   // dim amber
    intensity: 0.88,
    speed: 0.14,              // slightly faster = curiosity
  },
  Crisis_Escalation: {
    c1: [0.10, 0.45, 0.91],   // deep safe blue
    c2: [0.00, 0.70, 0.58],   // safe green
    c3: [0.18, 0.35, 0.65],   // muted indigo (no stimulation)
    c4: [0.15, 0.40, 0.55],   // cool teal (zero warm)
    intensity: 0.65,          // lower = non-threatening
    speed: 0.05,              // very slow = maximum calm
  },
};

function applyEmotionMod(base: Palette, emotion?: string): Palette {
  if (!emotion || emotion === 'Neutral') return base;
  const p = { ...base, c1: [...base.c1] as [number,number,number], c2: [...base.c2] as [number,number,number], c3: [...base.c3] as [number,number,number], c4: [...base.c4] as [number,number,number] };

  switch (emotion) {
    case 'Anxiety':
      // Push cooling colors, suppress warm
      p.c2 = [0.00, 0.85, 0.70]; // brighter mint
      p.c1 = [0.18, 0.50, 0.95]; // stronger blue
      p.c4 = [0.20, 0.30, 0.45]; // suppress amber → cool grey
      p.speed = Math.max(0.04, p.speed * 0.6); // slow down
      break;
    case 'Depression':
      // Push warm activating colors
      p.c4 = [1.00, 0.65, 0.35]; // bright amber
      p.c3 = [0.75, 0.50, 0.95]; // bright purple (validation)
      p.c1 = [0.35, 0.55, 0.90]; // lighter blue
      p.intensity = Math.min(1.0, p.intensity * 1.25);
      p.speed = p.speed * 1.3; // gentle speed up
      break;
    case 'Anger':
      // Maximum cooling, zero warmth
      p.c1 = [0.10, 0.40, 0.88]; // deep blue
      p.c2 = [0.00, 0.75, 0.65]; // strong mint
      p.c4 = [0.15, 0.30, 0.50]; // fully cool
      p.c3 = [0.30, 0.30, 0.60]; // muted purple
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

  // Smoothly lerp uniforms towards target palette
  useFrame((_, delta) => {
    const u = uniforms.current;
    u.uTime.value += delta;
    u.uResolution.value.set(size.width, size.height);

    // Smooth color transitions (~3s ease)
    const lerpFactor = 1 - Math.pow(0.15, delta);
    u.uColor1.value.lerp(new THREE.Color(...palette.c1), lerpFactor);
    u.uColor2.value.lerp(new THREE.Color(...palette.c2), lerpFactor);
    u.uColor3.value.lerp(new THREE.Color(...palette.c3), lerpFactor);
    u.uColor4.value.lerp(new THREE.Color(...palette.c4), lerpFactor);
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

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amp * snoise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * uSpeed;

  // Multi-layer aurora noise
  float n1 = fbm(p * 1.2 + vec2(t * 0.15, t * 0.08));
  float n2 = fbm(p * 0.8 + vec2(-t * 0.12, t * 0.1) + 10.0);
  float n3 = fbm(p * 1.6 + vec2(t * 0.07, -t * 0.14) + 20.0);
  float n4 = snoise(p * 0.5 + vec2(t * 0.05, t * 0.03) + 30.0);

  // Soft aurora bands
  float band1 = smoothstep(-0.2, 0.6, n1) * 0.65;
  float band2 = smoothstep(-0.1, 0.5, n2) * 0.55;
  float band3 = smoothstep(0.0, 0.7, n3) * 0.45;
  float band4 = smoothstep(-0.3, 0.4, n4) * 0.35;

  // Blend colors via aurora bands
  vec3 col = vec3(0.0);
  col += uColor1 * band1;
  col += uColor2 * band2;
  col += uColor3 * band3;
  col += uColor4 * band4;

  // Subtle vignette
  float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.6;
  col *= vignette;

  col *= uIntensity;

  // Premium grain texture
  float grain = fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}`,
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
