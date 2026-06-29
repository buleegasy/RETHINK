/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

// ═══════════════════════════════════════════════════════════════
// Mock Three.js using vi.hoisted to prevent hoisting ReferenceError
// ═══════════════════════════════════════════════════════════════
const mockThree = vi.hoisted(() => {
  let colorAllocationCount = 0;

  class MockVector2 {
    x: number;
    y: number;
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    set(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }
    lerp(target: MockVector2, alpha: number) {
      this.x += (target.x - this.x) * alpha;
      this.y += (target.y - this.y) * alpha;
      return this;
    }
    clone() {
      return new MockVector2(this.x, this.y);
    }
  }

  class MockColor {
    r: number;
    g: number;
    b: number;
    constructor(r = 0, g = 0, b = 0) {
      colorAllocationCount++;
      this.r = r;
      this.g = g;
      this.b = b;
    }
    setRGB(r: number, g: number, b: number) {
      this.r = r;
      this.g = g;
      this.b = b;
      return this;
    }
    lerp(target: MockColor, alpha: number) {
      this.r += (target.r - this.r) * alpha;
      this.g += (target.g - this.g) * alpha;
      this.b += (target.b - this.b) * alpha;
      return this;
    }
  }

  const MockShaderMaterial = function (this: any, opts: any) {
    this.vertexShader = opts?.vertexShader;
    this.fragmentShader = opts?.fragmentShader;
    this.uniforms = opts?.uniforms;
    this.depthTest = opts?.depthTest;
    this.depthWrite = opts?.depthWrite;
  };

  return {
    Vector2: MockVector2,
    Color: MockColor,
    Mesh: class {},
    ShaderMaterial: MockShaderMaterial,
    getColorAllocationCount: () => colorAllocationCount,
    resetColorAllocationCount: () => {
      colorAllocationCount = 0;
    },
  };
});

vi.mock('three', () => mockThree);

// ═══════════════════════════════════════════════════════════════
// Mock React Three Fiber using vi.hoisted
// ═══════════════════════════════════════════════════════════════
const mockR3F = vi.hoisted(() => {
  let useFrameCallback: ((state: any, delta: number) => void) | null = null;
  const mockSize = { width: 1920, height: 1080 };
  let canvasRenderCount = 0;
  let auroraMeshRenderCount = 0;

  return {
    Canvas: ({ children }: { children: React.ReactNode }) => {
      canvasRenderCount++;
      return <div data-testid="r3f-canvas">{children}</div>;
    },
    useFrame: (callback: (state: any, delta: number) => void) => {
      useFrameCallback = callback;
    },
    useThree: () => {
      auroraMeshRenderCount++;
      return {
        size: mockSize,
      };
    },
    getUseFrameCallback: () => useFrameCallback,
    getCanvasRenderCount: () => canvasRenderCount,
    getAuroraMeshRenderCount: () => auroraMeshRenderCount,
    resetRenderCounts: () => {
      canvasRenderCount = 0;
      auroraMeshRenderCount = 0;
    },
    getMockSize: () => mockSize,
  };
});

vi.mock('@react-three/fiber', () => mockR3F);

// ═══════════════════════════════════════════════════════════════
// Mock Chat Store using vi.hoisted
// ═══════════════════════════════════════════════════════════════
const mockChatStoreData = vi.hoisted(() => {
  return {
    fsmState: 'Onboarding',
    messages: [] as any[],
    isStreaming: false,
  };
});

vi.mock('../../store/chatStore', () => ({
  useChatStore: (selector: (state: any) => any) => selector(mockChatStoreData),
}));

// Now import the component to test
import { AmbientGlow } from './AmbientGlow';

describe('AmbientGlow WebGL Shader stress testing & verification', () => {
  beforeEach(() => {
    mockThree.resetColorAllocationCount();
    mockR3F.resetRenderCounts();
    mockChatStoreData.fsmState = 'Onboarding';
    mockChatStoreData.messages = [];
    mockChatStoreData.isStreaming = false;

    const mockSize = mockR3F.getMockSize();
    mockSize.width = 1920;
    mockSize.height = 1080;

    // Reset window metrics
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1000 });
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 });

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      writable: true,
      configurable: true,
      value: 2000,
    });
  });

  it('verifies aspect ratio calculation inside fragment shader is correct and handles dynamic resizing', () => {
    const spyShaderMaterialConstructor = vi.spyOn(mockThree, 'ShaderMaterial');
    render(<AmbientGlow />);
    const lastMaterialCall = spyShaderMaterialConstructor.mock.results[spyShaderMaterialConstructor.mock.results.length - 1].value;
    const fragmentShader = lastMaterialCall.fragmentShader;

    // Check if aspect ratio is calculated and used correctly
    expect(fragmentShader).toContain('float aspect = uResolution.x / uResolution.y;');
    expect(fragmentShader).toContain('vec2 p = (uv - 0.5) * vec2(aspect, 1.0);');

    // Simulate window resizing
    const mockSize = mockR3F.getMockSize();
    mockSize.width = 1280;
    mockSize.height = 720;
    
    const useFrameCallback = mockR3F.getUseFrameCallback();
    act(() => {
      useFrameCallback!(null, 0.016);
    });

    const uniforms = lastMaterialCall.uniforms;
    expect(uniforms.uResolution.value.x).toBe(1280);
    expect(uniforms.uResolution.value.y).toBe(720);
  });

  it('verifies that Gaussian weight normalization has bounds to prevent division-by-zero errors', () => {
    const spyShaderMaterialConstructor = vi.spyOn(mockThree, 'ShaderMaterial');
    render(<AmbientGlow />);
    const lastMaterialCall = spyShaderMaterialConstructor.mock.results[spyShaderMaterialConstructor.mock.results.length - 1].value;
    const fragmentShader = lastMaterialCall.fragmentShader;

    // Verify weight calculation
    expect(fragmentShader).toContain('float wSum = w1 + w2 + w3 + w4 + 0.15;');
    expect(fragmentShader).toContain('vec3 col = (uColor1 * w1 + uColor2 * w2 + uColor3 * w3 + uColor4 * w4) / wSum;');
  });

  it('measures the garbage collection impact of new THREE.Color allocations inside the frame loop', () => {
    render(<AmbientGlow />);
    
    const useFrameCallback = mockR3F.getUseFrameCallback();
    // Warm up
    act(() => {
      useFrameCallback!(null, 0.016);
    });

    mockThree.resetColorAllocationCount(); // Reset allocation counter

    // Run 100 frames to simulate ~1.6 seconds of animation
    act(() => {
      for (let i = 0; i < 100; i++) {
        useFrameCallback!(null, 0.016);
      }
    });

    // With GC optimization, there are 0 new THREE.Color allocations in the frame loop.
    const count = mockThree.getColorAllocationCount();
    console.log(`[GC Metrics] Total THREE.Color allocations over 100 frames: ${count}`);
    expect(count).toBe(0);
  });
});
