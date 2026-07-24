// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from '../hooks/useChat';
import { useChatStore } from '../store/chatStore';
import { chatApi } from '../api/chat';
import { chatRouter } from '../../../worker/src/routes/chat';
import { retrieveContext } from '../../../worker/src/lib/rag';
import type { Env } from '../../../worker/src/types';

// Mock chatApi for frontend testing
vi.mock('../api/chat', () => ({
  chatApi: {
    sendMessageStream: vi.fn(),
  },
}));

// Setup OpenAI Mock
const mockCompletionsCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: (...args: unknown[]) => mockCompletionsCreate(...args),
        },
      },
    })),
  };
});

describe('Challenger Empirical Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.getState().clearChat();
  });

  describe('1. Concurrency and double-submission protection in useChat.ts', () => {
    it('should block rapid double submissions synchronously', async () => {
      // Mock chatApi.sendMessageStream to return a slow-resolving promise
      let resolveStream: (value: ReadableStream) => void = () => {};
      const streamPromise = new Promise<ReadableStream>((resolve) => {
        resolveStream = resolve;
      });
      
      vi.mocked(chatApi.sendMessageStream).mockReturnValue(streamPromise);

      const { result } = renderHook(() => useChat());

      // Trigger first sendMessage
      let p1: Promise<void>;
      act(() => {
        p1 = result.current.sendMessage('Hello first time');
      });

      // Trigger second sendMessage immediately in the same microtask sequence
      let p2: Promise<void>;
      act(() => {
        p2 = result.current.sendMessage('Hello second time');
      });

      // Let the promise chain proceed slightly
      await new Promise((r) => setTimeout(r, 10));

      // Verify that only the first call actually went to chatApi
      expect(chatApi.sendMessageStream).toHaveBeenCalledTimes(1);
      expect(chatApi.sendMessageStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hello first time' }],
        })
      );

      // Verify isStreaming is set to true
      expect(useChatStore.getState().isStreaming).toBe(true);

      // Mock a readable stream to complete the first call
      const encoder = new TextEncoder();
      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"delta": "Hi", "done": true}\n\n'));
          controller.close();
        },
      });

      act(() => {
        resolveStream(mockReadableStream);
      });

      await act(async () => {
        await p1;
        await p2;
      });

      // Verify isStreaming returns to false
      expect(useChatStore.getState().isStreaming).toBe(false);
    });
  });

  describe('2. SSE chunk parsing boundary conditions', () => {
    it('should parse final chunk even if it lacks a trailing newline', async () => {
      const encoder = new TextEncoder();
      
      // We will feed two chunks:
      // Chunk 1 has a newline
      // Chunk 2 does not have a newline and is followed by stream termination
      const mockReadableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"delta": "Hello"}\n'));
          controller.enqueue(encoder.encode('data: {"delta": " world", "done": true}'));
          controller.close();
        },
      });

      vi.mocked(chatApi.sendMessageStream).mockResolvedValue(mockReadableStream);

      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('Test SSE');
      });

      const messages = useChatStore.getState().messages;
      const assistantMessage = messages.find(m => m.role === 'assistant');
      
      expect(assistantMessage).toBeDefined();
      expect(assistantMessage?.content).toBe('Hello world');
    });
  });

  describe('3. SQLite/D1 keyword fallback matching', () => {
    it('should query D1 correctly when Vectorize and Embedding fail', async () => {
      const mockDBAll = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'fallback_1',
            document_id: 'cbt_guide',
            document_title: 'CBT Handbook',
            heading_path: 'Intro',
            chunk_index: 0,
            content: 'Use cognitive restructuring to deal with negative automatic thoughts.',
          },
          {
            id: 'fallback_2',
            document_id: 'cbt_guide',
            document_title: 'CBT Handbook',
            heading_path: 'Intro',
            chunk_index: 1,
            content: 'Identify alternative explanations for negative events.',
          }
        ]
      });

      const mockEnv: Record<string, unknown> = {
        AI: {
          run: vi.fn().mockRejectedValue(new Error('Embedding generation failed')),
        },
        VECTORIZE: {
          query: vi.fn().mockRejectedValue(new Error('Vectorize query failed')),
        },
        DB: {
          prepare: vi.fn().mockReturnValue({
            bind: vi.fn().mockReturnValue({
              all: mockDBAll,
            }),
          }),
        },
      };

      const result = await retrieveContext(mockEnv as unknown as Env, 'negative thoughts', 3, 0.4);

      expect(mockEnv.AI.run).toHaveBeenCalled();
      expect(mockDBAll).toHaveBeenCalled();
      
      // Verify query is structured with LIKE OR clauses and ESCAPE protection
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("content LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\'")
      );

      expect(result.chunks.length).toBe(2);
      expect(result.chunks[0]).toContain('negative automatic thoughts');
      expect(result.scores[0]).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('4. LLM model sequencing and failover retry loops', () => {
    it('should sequentially fail over in Hono route and return successful backup model response', async () => {
      // Mock D1 DB for the route session lookup and update
      const mockDB = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        }),
      };

      const mockEnv: Record<string, unknown> = {
        FIREBASE_PROJECT_ID: 'rethink-project',
        FIREBASE_API_KEY: 'mock_firebase_key_for_testing',
        DB: mockDB,
        API_KEY: 'mock_openrouter_key',
        API_BASE_URL: 'https://openrouter.ai/api/v1',
      };

      // Mock OpenAI completions create behavior
      // Model sequence is: requestedModel (e.g. deepseek-r1 -> deepseek/deepseek-r1)
      // and backups: google/gemini-2.5-flash, meta-llama/llama-3.3-70b-instruct, openai/gpt-4o-mini.
      // We will make the first two fail, and the third (meta-llama/llama-3.3-70b-instruct) succeed.
      let attempt = 0;
      const failedModels: string[] = [];
      const successfulModelResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                reasoning_deduction: {
                  cognitive_distortion: '',
                  emotional_core: 'neutral',
                  intervention_strategy: 'continue',
                },
                retrieved_evidence: {
                  used_framework: ['cbt'],
                  retrieved_chunks: [],
                },
                state_machine: 'Onboarding',
                ui_control: {
                  color_theme: '#0A1128',
                  lighting_style: 'soft_ambient',
                  transition_speed: '5000ms',
                  effect: 'slow_breathing',
                },
                agent_reply: 'Hello, how can I help you today?',
              }),
            },
          },
        ],
      };

      mockCompletionsCreate.mockImplementation((params: { model: string }) => {
        attempt++;
        if (attempt < 3) {
          failedModels.push(params.model);
          throw new Error(`Model ${params.model} is overloaded or failed`);
        }
        return successfulModelResponse;
      });

      // Construct a valid POST request
      const reqBody = {
        messages: [{ role: 'user', content: 'Hi rethink' }],
        stream: false,
        sessionId: 'test-failover-session',
        model: 'deepseek-r1',
      };

      const request = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token-challenger',
        },
        body: JSON.stringify(reqBody),
      });

      const response = await chatRouter.fetch(request, mockEnv as unknown as Env);
      
      expect(response.status).toBe(200);
      const resJson = await response.json() as { content: string; model: string };

      expect(resJson.content).toBe('Hello, how can I help you today?');
      expect(failedModels).toContain('deepseek/deepseek-r1');
      expect(failedModels).toContain('google/gemini-2.5-flash');
      expect(resJson.model).toBe('meta-llama/llama-3.3-70b-instruct');
      expect(attempt).toBe(3);
    });
  });
});
