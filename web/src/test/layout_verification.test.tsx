import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// Define store mock state objects
const mockChatState = {
  messages: [] as any[],
  isStreaming: false,
  hasCompletedOnboarding: true,
  fsmState: 'Active_Listening',
  setOnboardingComplete: vi.fn(),
};

const mockAuthState = {
  user: { id: '1', username: 'TestUser' },
  isAuthenticated: true,
  logout: vi.fn(),
};

// Mock the store modules entirely to bypass real Zustand / localStorage imports
vi.mock('../store/chatStore', () => ({
  useChatStore: Object.assign(
    (selector: any) => selector(mockChatState),
    {
      getState: () => mockChatState,
      setState: (newState: any) => {
        Object.assign(mockChatState, newState);
      },
    }
  )
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: any) => selector(mockAuthState),
    {
      getState: () => mockAuthState,
      setState: (newState: any) => {
        Object.assign(mockAuthState, newState);
      },
    }
  )
}));

// Mock face emotion hook
vi.mock('../hooks/useFaceEmotion', () => ({
  useFaceEmotion: () => ({
    isCameraActive: true,
    isModelLoaded: true,
    isModelLoading: false,
    currentEmotion: {
      label: 'neutral',
      confidence: 90,
      allEmotions: { neutral: 0.9 }
    },
    videoRef: { current: null },
    startCamera: vi.fn().mockResolvedValue(undefined),
    stopCamera: vi.fn(),
    error: null,
    setCanvasRef: vi.fn(),
  }),
  EMOTION_MAP: {
    happy: { zh: '开心', emoji: '😊', color: '#F59E0B' },
    sad: { zh: '悲伤', emoji: '😢', color: '#60A5FA' },
    neutral: { zh: '平静', emoji: '😐', color: '#9CA3AF' },
  }
}));

// Mock voice input hook
vi.mock('../hooks/useVoiceInput', () => ({
  useVoiceInput: () => ({
    voiceState: 'idle',
    transcript: '',
    isSupported: true,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    clearTranscript: vi.fn(),
    error: null,
  })
}));

// Mock useChat hook
vi.mock('../hooks/useChat', () => ({
  useChat: () => ({
    sendMessage: vi.fn(),
    error: null,
  })
}));

// Mock Sidebar component since it is complex and not part of verified layout structures
vi.mock('../components/layout/SessionSidebar', () => ({
  SessionSidebar: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="sidebar" className={isOpen ? 'open' : 'closed'}>Sidebar</div>
  )
}));

// Mock LoginWall component
vi.mock('../components/auth/LoginWall', () => ({
  LoginWall: () => <div data-testid="login-wall">Login Wall</div>
}));

// Mock AmbientGlow component
vi.mock('../components/layout/AmbientGlow', () => ({
  AmbientGlow: () => <div data-testid="ambient-glow">Ambient Glow</div>
}));

// Now import target files
import { InputBar } from '../components/chat/InputBar';
import { ChatPanel } from '../components/chat/ChatPanel';
import App from '../App';

describe('Empirical Layout Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChatState.messages = [];
    mockChatState.isStreaming = false;
    mockChatState.hasCompletedOnboarding = true;
    mockChatState.fsmState = 'Active_Listening';
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: '1', username: 'TestUser' };
  });

  describe('1. CameraPanel & InputBar Layout Verification', () => {
    it('verifies CameraPanel is outside the InputBar centered container, uses fixed positioning, and does not block interaction', () => {
      const { container } = render(<InputBar onSend={vi.fn()} onEmotionChange={vi.fn()} />);
      
      // Get the root wrapper (it is the pointer-events-none container)
      const inputBarWrapper = container.firstChild as HTMLElement;
      expect(inputBarWrapper.className).toContain('pointer-events-none');
      expect(inputBarWrapper.className).toContain('absolute');
      expect(inputBarWrapper.className).toContain('bottom-0');

      // Get the CameraPanel container
      const cameraContainer = inputBarWrapper.querySelector('.fixed.top-24') as HTMLElement;
      expect(cameraContainer).toBeInTheDocument();
      expect(cameraContainer.className).toContain('fixed');
      expect(cameraContainer.className).toContain('top-24');
      expect(cameraContainer.className).toContain('right-4');
      expect(cameraContainer.className).toContain('z-50');
      expect(cameraContainer.className).toContain('pointer-events-auto');

      // Get the centered container
      const centeredContainer = inputBarWrapper.querySelector('.max-w-2xl') as HTMLElement;
      expect(centeredContainer).toBeInTheDocument();
      expect(centeredContainer.className).toContain('max-w-2xl');
      expect(centeredContainer.className).toContain('ms-auto');
      expect(centeredContainer.className).toContain('me-auto');
      expect(centeredContainer.className).toContain('pointer-events-auto');

      // Crucial Check: CameraPanel is NOT nested inside the centered container, they are siblings!
      expect(centeredContainer.contains(cameraContainer)).toBe(false);
      expect(cameraContainer.parentNode).toBe(inputBarWrapper);
      expect(centeredContainer.parentNode).toBe(inputBarWrapper);
    });
  });

  describe('2. ChatPanel Layout & Bottom Anchoring Verification', () => {
    it('verifies ChatPanel uses flexbox rules and mt-auto to anchor messages to the bottom', () => {
      // Add a couple of messages (sparse scenario)
      mockChatState.messages = [
        { id: '1', role: 'user', content: 'Hello' },
        { id: '2', role: 'assistant', content: 'Hi there!' }
      ];

      const { container } = render(<ChatPanel />);

      // Main container of ChatPanel
      const mainChatPanel = container.firstChild as HTMLElement;
      expect(mainChatPanel.className).toContain('flex-1');
      expect(mainChatPanel.className).toContain('overflow-y-auto');
      expect(mainChatPanel.className).toContain('flex');
      expect(mainChatPanel.className).toContain('flex-col');

      // Intermediate centering & flex container
      const flexInnerContainer = mainChatPanel.querySelector('.max-w-2xl') as HTMLElement;
      expect(flexInnerContainer).toBeInTheDocument();
      expect(flexInnerContainer.className).toContain('flex-1');
      expect(flexInnerContainer.className).toContain('flex');
      expect(flexInnerContainer.className).toContain('flex-col');

      // Active chat list container which has mt-auto
      const activeChatContainer = flexInnerContainer.firstChild as HTMLElement;
      expect(activeChatContainer).toBeInTheDocument();
      expect(activeChatContainer.className).toContain('flex');
      expect(activeChatContainer.className).toContain('flex-col');
      expect(activeChatContainer.className).toContain('mt-auto');
    });
  });

  describe('3. Desktop Header Layout Verification', () => {
    it('verifies that the Desktop Header spans the full screen width and is free of max-w-* constraints', () => {
      const { container } = render(<App />);

      // Find the desktop header container
      const desktopHeaderContainer = container.querySelector('.absolute.top-0.left-0') as HTMLElement;
      expect(desktopHeaderContainer).toBeInTheDocument();

      // Check class name specifications
      expect(desktopHeaderContainer.className).toContain('w-full');
      expect(desktopHeaderContainer.className).toContain('pointer-events-none');
      expect(desktopHeaderContainer.className).not.toContain('max-w-');

      // Inner container should also be full width and free of max-w constraints
      const innerDesktopHeader = desktopHeaderContainer.querySelector('.w-full.flex.justify-between') as HTMLElement;
      expect(innerDesktopHeader).toBeInTheDocument();
      expect(innerDesktopHeader.className).toContain('w-full');
      expect(innerDesktopHeader.className).not.toContain('max-w-');
    });
  });
});
