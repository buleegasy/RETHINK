import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';

interface ChatMessage {
  role: 'user' | 'assistant';
  techChain?: {
    intentEmotion?: string;
    riskLevel?: string;
  };
}

interface ChatStoreState {
  fsmState: string;
  messages: ChatMessage[];
  isStreaming: boolean;
}

// Mock Chat Store
const mockChatStoreData: ChatStoreState = {
  fsmState: 'Onboarding',
  messages: [],
  isStreaming: false,
};

vi.mock('../../store/chatStore', () => ({
  useChatStore: <T,>(selector: (state: ChatStoreState) => T): T => selector(mockChatStoreData),
}));

// Helper to convert hex to the rgb string JSDOM returns
const hexToRgbStr = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

import { AmbientGlow } from './AmbientGlow';

describe('AmbientGlow Component Tests', () => {
  beforeEach(() => {
    mockChatStoreData.fsmState = 'Onboarding';
    mockChatStoreData.messages = [];
    mockChatStoreData.isStreaming = false;
  });

  it('renders with Onboarding state colors', () => {
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');
    
    // Check Onboarding colors in radial-gradient
    expect(style).toContain(hexToRgbStr('#5C94FF')); // c1
    expect(style).toContain(hexToRgbStr('#24E0D1')); // c2
    expect(style).toContain(hexToRgbStr('#B388FF')); // c3
    expect(style).toContain(hexToRgbStr('#FF8CA8')); // c4
  });

  it('renders with Crisis_Escalation state colors', () => {
    mockChatStoreData.fsmState = 'Crisis_Escalation';
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');

    // Check Crisis_Escalation colors
    expect(style).toContain(hexToRgbStr('#0D47A1')); // c1
    expect(style).toContain(hexToRgbStr('#006064')); // c2
    expect(style).toContain(hexToRgbStr('#1A237E')); // c3
    expect(style).toContain(hexToRgbStr('#004D40')); // c4
  });

  it('renders with Active_Listening state colors', () => {
    mockChatStoreData.fsmState = 'Active_Listening';
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');

    // Check Active_Listening colors
    expect(style).toContain(hexToRgbStr('#6B8AFF')); // c1
    expect(style).toContain(hexToRgbStr('#4AE5FF')); // c2
    expect(style).toContain(hexToRgbStr('#D088FF')); // c3
    expect(style).toContain(hexToRgbStr('#FF7EB3')); // c4
  });

  it('renders with Socratic_Questioning state colors', () => {
    mockChatStoreData.fsmState = 'Socratic_Questioning';
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');

    // Check Socratic_Questioning colors
    expect(style).toContain(hexToRgbStr('#00B8D4')); // c1
    expect(style).toContain(hexToRgbStr('#1DE9B6')); // c2
    expect(style).toContain(hexToRgbStr('#8C9EFF')); // c3
    expect(style).toContain(hexToRgbStr('#00E676')); // c4
  });

  it('renders with Anxiety emotion override colors', () => {
    mockChatStoreData.fsmState = 'Onboarding';
    mockChatStoreData.messages = [
      {
        role: 'assistant',
        techChain: {
          intentEmotion: 'Anxiety',
          riskLevel: 'low',
        },
      },
    ];

    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');

    // Check Anxiety override colors
    expect(style).toContain(hexToRgbStr('#2979FF')); // c1 overridden
    expect(style).toContain(hexToRgbStr('#00E5FF')); // c2 overridden
    expect(style).toContain(hexToRgbStr('#536DFE')); // c3 overridden
    expect(style).toContain(hexToRgbStr('#1DE9B6')); // c4 overridden
  });

  it('renders with Depression emotion override colors', () => {
    mockChatStoreData.fsmState = 'Onboarding';
    mockChatStoreData.messages = [
      {
        role: 'assistant',
        techChain: {
          intentEmotion: 'Depression',
          riskLevel: 'low',
        },
      },
    ];

    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');

    // Check Depression override colors
    expect(style).toContain(hexToRgbStr('#7C4DFF')); // c1 overridden
    expect(style).toContain(hexToRgbStr('#FF80AB')); // c2 overridden
    expect(style).toContain(hexToRgbStr('#E040FB')); // c3 overridden
    expect(style).toContain(hexToRgbStr('#FF4081')); // c4 overridden
  });

  it('renders with Anger emotion override colors', () => {
    mockChatStoreData.fsmState = 'Onboarding';
    mockChatStoreData.messages = [
      {
        role: 'assistant',
        techChain: {
          intentEmotion: 'Anger',
          riskLevel: 'low',
        },
      },
    ];

    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const style = activeLayer.getAttribute('style');

    // Check Anger override colors
    expect(style).toContain(hexToRgbStr('#01579B')); // c1 overridden
    expect(style).toContain(hexToRgbStr('#006064')); // c2 overridden
    expect(style).toContain(hexToRgbStr('#1A237E')); // c3 overridden
    expect(style).toContain(hexToRgbStr('#004D40')); // c4 overridden
  });

  it('applies the correct opacity based on isStreaming active state', () => {
    // When isStreaming is false
    mockChatStoreData.isStreaming = false;
    const { getByTestId, rerender } = render(<AmbientGlow />);
    let container = getByTestId('ambient-glow-container');
    expect(container.getAttribute('style')).toContain('opacity: 0.6');

    // When isStreaming is true
    mockChatStoreData.isStreaming = true;
    rerender(<AmbientGlow />);
    container = getByTestId('ambient-glow-container');
    expect(container.getAttribute('style')).toContain('opacity: 0.85');
  });

  it('cross-fades between states when FSM state changes', () => {
    const { getByTestId, rerender } = render(<AmbientGlow />);
    
    // Initially Layer A is active (opacity: 1), Layer B is inactive (opacity: 0)
    const layerA = getByTestId('glow-layer-a');
    const layerB = getByTestId('glow-layer-b');
    expect(layerA.getAttribute('style')).toContain('opacity: 1');
    expect(layerB.getAttribute('style')).toContain('opacity: 0');

    // Change state to CBT_Stripping
    mockChatStoreData.fsmState = 'CBT_Stripping';
    rerender(<AmbientGlow />);

    // Layer B should now be active (opacity: 1) with CBT_Stripping colors
    expect(layerA.getAttribute('style')).toContain('opacity: 0');
    expect(layerB.getAttribute('style')).toContain('opacity: 1');
    expect(layerB.getAttribute('style')).toContain(hexToRgbStr('#2979FF')); // CBT_Stripping c1
  });
});
