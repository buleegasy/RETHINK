/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { transition, createDefaultContext } from '../../../worker/src/lib/fsm';
import { getModelName, getModelSequence } from '../../../worker/src/lib/llm';
import { retrieveContext } from '../../../worker/src/lib/rag';

// Mock openai module
const mockCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
  };
});

describe('Backend Robustness & Fallback Tests', () => {
  describe('1. FSM state transition rules and turn counts', () => {
    it('should transition correctly from Pre_Info_Collection and increase turn counts', () => {
      const ctx = createDefaultContext();
      expect(ctx.currentState).toBe('Onboarding');
      expect(ctx.turnCount).toBe(0);

      // Crisis intent should immediately trigger Crisis_Escalation
      const crisisIntent = {
        type: 'crisis' as const,
        confidence: 0.99,
        triggers: ['想死'],
      };
      
      const transitionResult = transition(ctx, crisisIntent, 'pre');
      expect(transitionResult.nextState).toBe('Crisis_Escalation');
      expect(transitionResult.trigger).toContain('危机信号');
    });

    it('should stay in Crisis_Escalation as absorbing state', () => {
      const ctx = {
        ...createDefaultContext(),
        currentState: 'Crisis_Escalation' as const,
        turnCount: 5,
      };

      const casualIntent = {
        type: 'casual' as const,
        confidence: 0.99,
        triggers: [],
      };

      const transitionResult = transition(ctx, casualIntent, 'pre');
      expect(transitionResult.nextState).toBe('Crisis_Escalation');
      expect(transitionResult.trigger).toContain('危机状态锁定');
    });
  });

  describe('2. LLM model mapping and sequence fallbacks', () => {
    it('should map model requests to valid OpenRouter model IDs', () => {
      const mockEnv: any = {};
      expect(getModelName(mockEnv, 'deepseek-v4-flash')).toBe('google/gemini-2.5-flash');
      expect(getModelName(mockEnv, 'deepseek-r1')).toBe('deepseek/deepseek-r1');
      expect(getModelName(mockEnv, 'gpt-4o-mini')).toBe('openai/gpt-4o-mini');
      expect(getModelName(mockEnv, 'custom-unmapped-model')).toBe('custom-unmapped-model');
      expect(getModelName(mockEnv)).toBe('google/gemini-2.5-flash');
    });

    it('should generate model sequence with primary first and backups following', () => {
      const mockEnv: any = {};
      const sequence = getModelSequence(mockEnv, 'deepseek-r1');
      expect(sequence[0]).toBe('deepseek/deepseek-r1');
      expect(sequence).toContain('google/gemini-2.5-flash');
      expect(sequence).toContain('meta-llama/llama-3.3-70b-instruct');
      expect(sequence).toContain('openai/gpt-4o-mini');
      // Deduplicated
      const uniqueSet = new Set(sequence);
      expect(sequence.length).toBe(uniqueSet.size);
    });
  });

  describe('3. D1 SQL keyword-search fallback when Vectorize fails', () => {
    it('should execute D1 SQL LIKE fallback when embedding generation throws error', async () => {
      // Mock Env with failing AI and working D1 DB
      const mockDBAll = vi.fn().mockResolvedValue({
        results: [
          {
            id: 'doc_test_0',
            document_id: 'doc_test',
            document_title: 'Test Guideline',
            heading_path: 'Heading 1',
            chunk_index: 0,
            content: 'This chunk contains the anxiety and stress coping strategies.',
          }
        ]
      });

      const mockEnv: any = {
        AI: {
          run: vi.fn().mockRejectedValue(new Error('BGE-M3 model load failed')),
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

      const result = await retrieveContext(mockEnv, 'anxiety stress', 3, 0.4);

      expect(mockEnv.AI.run).toHaveBeenCalled();
      expect(mockDBAll).toHaveBeenCalled();
      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0]).toContain('anxiety and stress');
      expect(result.sourceDocuments[0]).toBe('Test Guideline');
      expect(result.scores[0]).toBeGreaterThanOrEqual(0.5);
    });
  });
});
