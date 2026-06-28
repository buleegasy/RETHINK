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

import React, { useMemo, useRef, useEffect } from 'react';
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
  c2: [number, number, number]; // Healing Mint
  c3: [number, number, number]; // Empathy Purple
  c4: [number, number, number]; // Warm Amber
  intensity: number;
  speed: number;
}

const FSM_PALETTES: Record<FSMState, Palette> = {
  Onboarding: {
    c1: [0.45, 0.73, 1.00],   // Bright soft blue
    c2: [0.15, 0.90, 0.75],   // Luminous mint
    c3: [0.75, 0.55, 1.00],   // Pastel purple
    c4: [1.00, 0.75, 0.55],   // Warm soft amber
    intensity: 1.1,
    speed: 0.12,
  },
  Active_Listening: {
    c1: [0.35, 0.65, 0.95],
    c2: [0.10, 0.85, 0.70],
    c3: [0.85, 0.60, 1.00],
    c4: [1.00, 0.65, 0.45],
    intensity: 1.0,
    speed: 0.08,
  },
  CBT_Stripping: {
    c1: [0.40, 0.70, 1.00],
    c2: [0.20, 0.88, 0.80],
    c3: [0.65, 0.50, 0.90],
    c4: [0.90, 0.60, 0.40],
    intensity: 1.0,
    speed: 0.10,
  },
  Socratic_Questioning: {
    c1: [0.25, 0.85, 0.95],
    c2: [0.15, 0.90, 0.75],
    c3: [0.75, 0.55, 1.00],
    c4: [0.80, 0.55, 0.35],
    intensity: 1.05,
    speed: 0.14,
  },
  Crisis_Escalation: {
    c1: [0.20, 0.60, 0.95],
    c2: [0.10, 0.80, 0.70],
    c3: [0.30, 0.45, 0.80],
    c4: [0.25, 0.55, 0.75],
    intensity: 0.9,
    speed: 0.05,
  },
};

function applyEmotionMod(base: Palette, emotion?: string): Palette {
  if (!emotion || emotion === 'Neutral') return base;
  const p = { ...base, c1: [...base.c1] as [number,number,number], c2: [...base.c2] as [number,number,number], c3: [...base.c3] as [number,number,number], c4: [...base.c4] as [number,number,number] };

  switch (emotion) {
    case 'Anxiety':
      // Push cooling colors, suppress warm
      p.c2 = [0.15, 0.95, 0.85]; // bright mint
      p.c1 = [0.35, 0.70, 1.00]; // bright blue
      p.c4 = [0.40, 0.50, 0.70]; // cool greyish blue
      p.c3 = [0.50, 0.60, 0.90]; // cool purple
      p.speed = Math.max(0.04, p.speed * 0.6); // slow down
      break;
    case 'Depression':
      // Push warm activating colors
      p.c4 = [1.00, 0.80, 0.50]; // radiant amber
      p.c3 = [0.90, 0.65, 1.00]; // bright purple
      p.c1 = [0.55, 0.75, 1.00]; // lighter blue
      p.intensity = Math.min(1.3, p.intensity * 1.15);
      p.speed = p.speed * 1.3; // gentle speed up
      break;
    case 'Anger':
      // Maximum cooling, zero warmth
      p.c1 = [0.20, 0.60, 0.95]; 
      p.c2 = [0.10, 0.85, 0.75]; 
      p.c4 = [0.25, 0.45, 0.65]; 
      p.c3 = [0.45, 0.45, 0.80]; 
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

  // Mouse & Scroll track refs
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const scrollRef = useRef(0);

  // Pre-allocated THREE.Color target instances for GC optimization
  const targetColors = useRef([
    new THREE.Color(),
    new THREE.Color(),
    new THREE.Color(),
    new THREE.Color(),
  ]);

  // Cached layout dimensions to prevent layout thrashing
  const layoutHeightRef = useRef({ scrollHeight: 0, innerHeight: 0 });

  // Setup non-react-rendering event listeners
  useEffect(() => {
    const updateLayoutMetrics = () => {
      layoutHeightRef.current.scrollHeight = document.documentElement.scrollHeight;
      layoutHeightRef.current.innerHeight = window.innerHeight;
    };

    // Initialize metrics
    updateLayoutMetrics();

    const handlePointerMove = (e: PointerEvent) => {
      // Normalize client coordinates to WebGL clip space range [-1, 1]
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      const { scrollHeight, innerHeight } = layoutHeightRef.current;
      const docHeight = scrollHeight - innerHeight;
      scrollRef.current = docHeight > 0 ? window.scrollY / docHeight : 0;
    };

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          updateLayoutMetrics();
        })
      : null;

    if (resizeObserver) {
      resizeObserver.observe(document.documentElement);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateLayoutMetrics, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateLayoutMetrics);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  const uniforms = useRef({
    uTime: { value: 0 },
    uSpeed: { value: palette.speed },
    uResolution: { value: new THREE.Vector2(size.width, size.height) },
    uColor1: { value: new THREE.Color(...palette.c1) },
    uColor2: { value: new THREE.Color(...palette.c2) },
    uColor3: { value: new THREE.Color(...palette.c3) },
    uColor4: { value: new THREE.Color(...palette.c4) },
    uIntensity: { value: palette.intensity },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uScroll: { value: 0.0 },
  });

  useFrame((_, delta) => {
    const u = uniforms.current;
    u.uTime.value += delta;
    u.uResolution.value.set(size.width, size.height);

    // Damped interpolation factor for inertia
    const lerpFactor = 1 - Math.pow(0.15, delta);

    // Clamp the pointer and scroll lerp factor using const alpha = Math.min(1.0, lerpFactor * 2.0)
    const alpha = Math.min(1.0, lerpFactor * 2.0);

    // Smoothly interpolate interactive inputs using alpha
    u.uMouse.value.lerp(mouseRef.current, alpha);
    u.uScroll.value += (scrollRef.current - u.uScroll.value) * alpha;

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
uniform vec2 uMouse;
uniform float uScroll;

// Simplex 2D noise implementation (kept for speed and compatibility)
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
  
  float t = uTime * uSpeed;

  // 1. Interactive input warp scales
  vec2 warpMouse = uMouse * 0.15;
  vec2 warpScroll = vec2(0.0, uScroll * 0.25);
  
  // 2. Warp Layer 1 (2 noise calls)
  vec2 q = vec2(
    snoise(p * 0.7 + vec2(t * 0.04, t * 0.02) + warpMouse),
    snoise(p * 0.7 - vec2(t * 0.03, -t * 0.05) - warpScroll)
  );

  // 3. Warp Layer 2 (2 noise calls)
  vec2 r = vec2(
    snoise(p * 1.1 + q * 1.3 + vec2(t * 0.06, -t * 0.03) + vec2(4.2, 1.8)),
    snoise(p * 1.1 + q * 1.3 - vec2(-t * 0.04, t * 0.05) + vec2(8.9, 3.1))
  );

  // Final warped coordinate domain
  vec2 w = p + r * 0.45;

  // 4. Color zone blending using Gaussian Distance Fields
  vec2 cPos1 = vec2(-0.6, 0.4);  // Top-left
  vec2 cPos2 = vec2(0.6, 0.4);   // Top-right
  vec2 cPos3 = vec2(-0.5, -0.5); // Bottom-left
  vec2 cPos4 = vec2(0.5, -0.4);  // Bottom-right

  float d1 = length(w - cPos1);
  float d2 = length(w - cPos2);
  float d3 = length(w - cPos3);
  float d4 = length(w - cPos4);

  float w1 = exp(-d1 * d1 * 1.8);
  float w2 = exp(-d2 * d2 * 1.8);
  float w3 = exp(-d3 * d3 * 1.8);
  float w4 = exp(-d4 * d4 * 1.8);

  // Weight normalization: Add 0.3 to wSum to prevent dark dead-zones and increase overall vibrance
  float wSum = w1 + w2 + w3 + w4 + 0.3;
  w1 /= (wSum * 0.85);
  w2 /= (wSum * 0.85);
  w3 /= (wSum * 0.85);
  w4 /= (wSum * 0.85);

  vec3 col = uColor1 * w1 + uColor2 * w2 + uColor3 * w3 + uColor4 * w4;

  // Enhance saturation and brightness (Gemini look is highly luminous)
  col = pow(col, vec3(0.85)); // slight gamma boost to brighten midtones

  // 5. Zero-cost Pseudo-3D Shading & Specular Sheen
  // Uses the displacement vector 'r' as the gradient slope of the height field
  vec2 slope = r * 0.6;
  vec3 normal = normalize(vec3(-slope.x, -slope.y, 1.2));
  vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0)); // Direct lighting from top-right
  
  float diffuse = max(dot(normal, lightDir), 0.0) * 0.15 + 0.85;
  float specular = pow(max(dot(normal, lightDir), 0.0), 32.0) * 0.12;
  
  col *= diffuse;
  col += vec3(specular);

  // 6. Vignette (very subtle to preserve brightness)
  float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.5;
  col *= vignette;

  col *= uIntensity;

  // 7. Dynamic Film Grain (Midtone responsive)
  float grainNoise = fract(sin(dot(uv * uResolution + t * 0.02, vec2(12.9898, 78.233))) * 43758.5453);
  float grainAmount = (grainNoise - 0.5) * 0.015;
  
  // Film response curve masks grain in pure darks & bright spots
  float luminance = dot(col, vec3(0.299, 0.587, 0.114));
  grainAmount *= smoothstep(0.02, 0.18, luminance) * smoothstep(0.98, 0.82, luminance);
  col += grainAmount;

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
