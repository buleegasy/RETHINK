import { vi } from 'vitest';

vi.mock('../chat/CameraPanel', () => ({ CameraPanel: () => <div data-testid="camera-panel">Camera Panel</div> }));

// Define localStorage mock on global/window objects
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock authApi
vi.mock('../../api/auth', () => ({
  authApi: {
    getSessions: vi.fn(),
    getSessionDetail: vi.fn(),
    deleteSession: vi.fn(),
  },
}));

describe('SessionSidebar Component Deletion Feature', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let SessionSidebar: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useChatStore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useSessionStore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let useAuthStore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authApi: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamically import to ensure localStorage is mocked beforehand
    const sidebarModule = await import('./SessionSidebar');
    const chatStoreModule = await import('../../store/chatStore');
    const sessionStoreModule = await import('../../store/sessionStore');
    const authStoreModule = await import('../../store/authStore');
    const authApiModule = await import('../../api/auth');

    SessionSidebar = sidebarModule.SessionSidebar;
    useChatStore = chatStoreModule.useChatStore;
    useSessionStore = sessionStoreModule.useSessionStore;
    useAuthStore = authStoreModule.useAuthStore;
    authApi = authApiModule.authApi;

    useAuthStore.setState({ token: 'mock-token' });
    useChatStore.setState({
      sessionId: 'session-active',
      messages: [],
      currentStage: '剥离事实',
      fsmState: 'Onboarding',
    });
    useSessionStore.setState({
      sessions: [
        {
          id: 'session-active',
          title: 'Active Session',
          current_stage: 1,
          fsm_state: 'Onboarding',
          created_at: 1000,
          updated_at: 1000,
        },
        {
          id: 'session-other',
          title: 'Other Session',
          current_stage: 1,
          fsm_state: 'Onboarding',
          created_at: 1000,
          updated_at: 1000,
        },
      ],
      isLoadingSessions: false,
    });
  });

  it('renders trash button for each session', () => {
    render(<SessionSidebar isOpen={true} onClose={vi.fn()} />);

    const deleteButtons = screen.getAllByLabelText('删除此对话');
    expect(deleteButtons).toHaveLength(2);
  });

  it('performs deletion, filters sessions, and clears chat when active session is deleted', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(authApi.deleteSession).mockResolvedValue({ success: true });

    render(<SessionSidebar isOpen={true} onClose={vi.fn()} />);

    const deleteButtons = screen.getAllByLabelText('删除此对话');
    
    // Click delete on the active session
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('确定要删除这个对话吗？此操作不可恢复。');
    expect(authApi.deleteSession).toHaveBeenCalledWith('session-active');

    await waitFor(() => {
      const remainingSessions = useSessionStore.getState().sessions;
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].id).toBe('session-other');
      
      // Since it was the active session, clearChat should be called (sessionId becomes null)
      expect(useChatStore.getState().sessionId).toBeNull();
    });
  });

  it('performs deletion, filters sessions, but does not clear chat when a non-active session is deleted', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(authApi.deleteSession).mockResolvedValue({ success: true });

    render(<SessionSidebar isOpen={true} onClose={vi.fn()} />);

    const deleteButtons = screen.getAllByLabelText('删除此对话');
    
    // Click delete on the other session
    fireEvent.click(deleteButtons[1]);

    expect(confirmSpy).toHaveBeenCalledWith('确定要删除这个对话吗？此操作不可恢复。');
    expect(authApi.deleteSession).toHaveBeenCalledWith('session-other');

    await waitFor(() => {
      const remainingSessions = useSessionStore.getState().sessions;
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].id).toBe('session-active');
      
      // Since active session wasn't deleted, chat stays intact
      expect(useChatStore.getState().sessionId).toBe('session-active');
    });
  });

  it('aborts deletion if user cancels confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SessionSidebar isOpen={true} onClose={vi.fn()} />);

    const deleteButtons = screen.getAllByLabelText('删除此对话');
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(authApi.deleteSession).not.toHaveBeenCalled();

    const remainingSessions = useSessionStore.getState().sessions;
    expect(remainingSessions).toHaveLength(2);
    expect(useChatStore.getState().sessionId).toBe('session-active');
  });

  it('renders CameraPanel at the bottom of the sidebar', () => {
    render(<SessionSidebar isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('camera-panel')).toBeInTheDocument();
  });
});
