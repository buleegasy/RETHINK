import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVoiceInput } from './useVoiceInput';

// Define the mock class structure based on ISpeechRecognition
class MockSpeechRecognition {
  lang: string = '';
  continuous: boolean = false;
  interimResults: boolean = false;
  maxAlternatives: number = 1;

  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();

  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;

  // Add event target methods if needed by tests, though not strictly required by hook implementation
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}

describe('useVoiceInput', () => {
  let originalSpeechRecognition: unknown;
  let mockRecognitionInstance: MockSpeechRecognition;

  beforeEach(() => {
    vi.useFakeTimers();

    // Setup Mock SpeechRecognition
    originalSpeechRecognition = (window as unknown).SpeechRecognition || (window as unknown).webkitSpeechRecognition;

    mockRecognitionInstance = new MockSpeechRecognition();
    const MockConstructor = vi.fn(() => mockRecognitionInstance);

    (window as unknown).SpeechRecognition = MockConstructor;
    (window as unknown).webkitSpeechRecognition = MockConstructor;
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();

    // Restore globals
    if (originalSpeechRecognition) {
      (window as unknown).SpeechRecognition = originalSpeechRecognition;
      (window as unknown).webkitSpeechRecognition = originalSpeechRecognition;
    } else {
      delete (window as unknown).SpeechRecognition;
      delete (window as unknown).webkitSpeechRecognition;
    }

    cleanup();
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useVoiceInput());

    expect(result.current.voiceState).toBe('idle');
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.isSupported).toBe(true);
  });

  it('should set isSupported to false if window.SpeechRecognition is missing', () => {
    delete (window as unknown).SpeechRecognition;
    delete (window as unknown).webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceInput());
    expect(result.current.isSupported).toBe(false);
  });

  it('should return error if startListening is called but not supported', () => {
    delete (window as unknown).SpeechRecognition;
    delete (window as unknown).webkitSpeechRecognition;

    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.error).toBe('您的浏览器不支持语音识别');
    expect(result.current.voiceState).toBe('idle');
  });

  it('should start listening successfully', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognitionInstance.start).toHaveBeenCalled();

    // Trigger onstart event
    act(() => {
      if (mockRecognitionInstance.onstart) {
        mockRecognitionInstance.onstart();
      }
    });

    expect(result.current.voiceState).toBe('listening');
    expect(result.current.error).toBeNull();
  });

  it('should handle start() throwing an error', () => {
    mockRecognitionInstance.start = vi.fn().mockImplementation(() => {
      throw new Error('Test Error');
    });

    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    expect(result.current.error).toBe('启动语音识别失败');
    expect(result.current.voiceState).toBe('idle');
  });

  it('should update transcript and call onTranscript on result', () => {
    const onTranscriptMock = vi.fn();
    const { result } = renderHook(() => useVoiceInput(onTranscriptMock));

    act(() => {
      result.current.startListening();
    });

    // Simulate interim result
    const interimEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'hello ' }],
      ] as unknown,
    };
    interimEvent.results[0].isFinal = false;
    interimEvent.results.length = 1;

    act(() => {
      if (mockRecognitionInstance.onresult) {
        mockRecognitionInstance.onresult(interimEvent);
      }
    });

    expect(result.current.transcript).toBe('hello ');
    expect(onTranscriptMock).not.toHaveBeenCalled();

    // Simulate final result
    const finalEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'hello world' }],
      ] as unknown,
    };
    finalEvent.results[0].isFinal = true;
    finalEvent.results.length = 1;

    act(() => {
      if (mockRecognitionInstance.onresult) {
        mockRecognitionInstance.onresult(finalEvent);
      }
    });

    expect(result.current.transcript).toBe('hello world');
    expect(onTranscriptMock).toHaveBeenCalledWith('hello world');
  });

  it('should stop listening successfully', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      result.current.stopListening();
    });

    expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    expect(result.current.voiceState).toBe('idle');
  });

  it('should handle various error codes on onerror', () => {
    const { result, unmount } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    // Test 'no-speech'
    act(() => {
      if (mockRecognitionInstance.onerror) {
        mockRecognitionInstance.onerror({ error: 'no-speech' });
      }
    });
    expect(result.current.error).toBe('未检测到语音，请重试');
    expect(result.current.voiceState).toBe('error');

    // Advance timer to test auto-reset to 'idle'
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.voiceState).toBe('idle');

    act(() => {
      result.current.startListening();
    });

    // Test 'not-allowed'
    act(() => {
      if (mockRecognitionInstance.onerror) {
        mockRecognitionInstance.onerror({ error: 'not-allowed' });
      }
    });
    expect(result.current.error).toBe('麦克风权限被拒绝');

    // Clear pending timers from the second error before unmounting
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    unmount();
  });

  it('should transition from listening to idle on onend', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    act(() => {
      if (mockRecognitionInstance.onstart) {
        mockRecognitionInstance.onstart();
      }
    });
    expect(result.current.voiceState).toBe('listening');

    act(() => {
      if (mockRecognitionInstance.onend) {
        mockRecognitionInstance.onend();
      }
    });

    expect(result.current.voiceState).toBe('idle');
  });

  it('should clear transcript', () => {
    const { result } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    const finalEvent = {
      resultIndex: 0,
      results: [
        [{ transcript: 'test string' }],
      ] as unknown,
    };
    finalEvent.results[0].isFinal = true;
    finalEvent.results.length = 1;

    act(() => {
      if (mockRecognitionInstance.onresult) {
        mockRecognitionInstance.onresult(finalEvent);
      }
    });

    expect(result.current.transcript).toBe('test string');

    act(() => {
      result.current.clearTranscript();
    });

    expect(result.current.transcript).toBe('');
  });

  it('should abort and clean listeners on unmount', () => {
    const { result, unmount } = renderHook(() => useVoiceInput());

    act(() => {
      result.current.startListening();
    });

    unmount();

    expect(mockRecognitionInstance.abort).toHaveBeenCalled();
    expect(mockRecognitionInstance.onstart).toBeNull();
    expect(mockRecognitionInstance.onresult).toBeNull();
    expect(mockRecognitionInstance.onerror).toBeNull();
    expect(mockRecognitionInstance.onend).toBeNull();
  });
});
