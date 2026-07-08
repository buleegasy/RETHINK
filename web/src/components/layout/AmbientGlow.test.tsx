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

import { AmbientGlow } from './AmbientGlow';

// Helper: get all blob divs inside a layer
const getBlobColors = (layer: HTMLElement): string[] => {
  // Blob divs are the direct children of the layer div
  return Array.from(layer.children).map(
    (child) => (child as HTMLElement).style.backgroundColor
  );
};

// Helper to convert hex to the rgb string JSDOM returns
const hexToRgbStr = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
};

describe('AmbientGlow Component Tests', () => {
  beforeEach(() => {
    mockChatStoreData.fsmState = 'Onboarding';
    mockChatStoreData.messages = [];
    mockChatStoreData.isStreaming = false;
  });

  it('renders with Onboarding state colors', () => {
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-calm-1)'); // c1
    expect(colors).toContain('var(--aura-calm-2)'); // c2
  });

  it('renders with Crisis_Escalation state colors', () => {
    mockChatStoreData.fsmState = 'Crisis_Escalation';
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-cool-1)'); // c1
    expect(colors).toContain('var(--aura-cool-2)'); // c2
  });

  it('renders with Active_Listening state colors', () => {
    mockChatStoreData.fsmState = 'Active_Listening';
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-calm-1)'); // c1
    expect(colors).toContain('var(--aura-calm-2)'); // c2
  });

  it('renders with Socratic_Questioning state colors', () => {
    mockChatStoreData.fsmState = 'Socratic_Questioning';
    const { getByTestId } = render(<AmbientGlow />);
    const activeLayer = getByTestId('glow-layer-a');
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-calm-1)'); // c1
    expect(colors).toContain('var(--aura-calm-2)'); // c2
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
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-cool-1)'); // c1 overridden
    expect(colors).toContain('var(--aura-cool-2)'); // c2 overridden
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
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-warm-1)'); // c1 overridden
    expect(colors).toContain('var(--aura-warm-2)'); // c2 overridden
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
    const colors = getBlobColors(activeLayer);

    expect(colors).toContain('var(--aura-cool-1)'); // c1 overridden
    expect(colors).toContain('var(--aura-cool-2)'); // c2 overridden
  });

  it('applies the correct opacity based on isStreaming active state', () => {
    // When isStreaming is false
    mockChatStoreData.isStreaming = false;
    const { getByTestId, rerender } = render(<AmbientGlow />);
    let container = getByTestId('ambient-glow-container');
    expect(container.getAttribute('style')).toContain('opacity: 0.5');
 
    // When isStreaming is true
    mockChatStoreData.isStreaming = true;
    rerender(<AmbientGlow />);
    container = getByTestId('ambient-glow-container');
    expect(container.getAttribute('style')).toContain('opacity: 0.7');
  });

  it('cross-fades between states when FSM state changes', () => {
    const { getByTestId, rerender } = render(<AmbientGlow />);
    
    // Initially Layer A is active (opacity: 1), Layer B is inactive (opacity: 0)
    const layerA = getByTestId('glow-layer-a');
    const layerB = getByTestId('glow-layer-b');
    expect(layerA.getAttribute('style')).toContain('opacity: 1');
    expect(layerB.getAttribute('style')).toContain('opacity: 0');

    // Change state to Crisis_Escalation
    mockChatStoreData.fsmState = 'Crisis_Escalation';
    rerender(<AmbientGlow />);

    // Layer B should now be active (opacity: 1) with Crisis_Escalation colors
    expect(layerA.getAttribute('style')).toContain('opacity: 0');
    expect(layerB.getAttribute('style')).toContain('opacity: 1');
    const blobColors = getBlobColors(layerB);
    expect(blobColors).toContain('var(--aura-cool-1)'); // Crisis_Escalation c1
  });
});
