import { describe, it, expect } from 'vitest';
import { containsProhibitedWords, sanitizeResponse, PROHIBITED_WORDS } from '../lib/sanitizer';
import { getPromptForState, RECEPTIONIST_GREETING_CANDIDATES, FSM_STATES, type FSMState } from '../lib/fsm';
import { buildSystemPromptFSM } from '../lib/llm';
import type { IntentType } from '../lib/intent-router';

describe('Empirical Adversarial Verification for R4 (Prohibited Words & Sanitizer)', () => {
  describe('1. Zero occurrence of "卧槽" and Prohibited Words across System Prompts & Candidates', () => {
    it('RECEPTIONIST_GREETING_CANDIDATES should contain zero prohibited words', () => {
      expect(RECEPTIONIST_GREETING_CANDIDATES.length).toBeGreaterThanOrEqual(5);
      const uniqueGreetings = new Set(RECEPTIONIST_GREETING_CANDIDATES);
      expect(uniqueGreetings.size).toBe(RECEPTIONIST_GREETING_CANDIDATES.length);

      for (const greeting of RECEPTIONIST_GREETING_CANDIDATES) {
        expect(containsProhibitedWords(greeting)).toBe(false);
        expect(greeting).not.toContain('卧槽');
      }
    });

    it('getPromptForState should contain zero prohibited words for all FSM states', () => {
      for (const state of FSM_STATES) {
        for (let layer = 1; layer <= 5; layer++) {
          const prompt = getPromptForState(state, layer);
          expect(containsProhibitedWords(prompt)).toBe(false);
          expect(prompt).not.toContain('卧槽');
        }
      }
    });

    it('buildSystemPromptFSM should contain zero prohibited words across all state & intent combinations', () => {
      const intents: IntentType[] = [
        'casual',
        'emotional',
        'crisis',
        'academic_stress',
        'peer_relationship',
        'family_pressure',
        'source_trace',
        'ambiguous',
      ];

      for (const state of FSM_STATES) {
        for (const intent of intents) {
          const systemPrompt = buildSystemPromptFSM(state, intent);
          expect(containsProhibitedWords(systemPrompt)).toBe(false);
          expect(systemPrompt).not.toContain('卧槽');
        }
      }
    });
  });

  describe('2. Sanitizer Edge Case & Stress Testing', () => {
    it('containsProhibitedWords correctly identifies all listed prohibited words', () => {
      for (const word of PROHIBITED_WORDS) {
        expect(containsProhibitedWords(`前缀${word}后缀`)).toBe(true);
      }
    });

    it('sanitizeResponse replaces "卧槽" and "靠北" with "天哪"', () => {
      expect(sanitizeResponse('卧槽这真的假的')).toBe('天哪这真的假的');
      expect(sanitizeResponse('靠北，这也太离谱了')).toBe('天哪，这也太离谱了');
      expect(sanitizeResponse('卧槽！靠北！到底发生了什么？')).toBe('天哪！天哪！到底发生了什么？');
    });

    it('does not corrupt valid Chinese words like "依靠", "可靠", "操作", "操心"', () => {
      expect(sanitizeResponse('我们需要相互依靠')).toBe('我们需要相互依靠');
      expect(sanitizeResponse('这个系统很可靠')).toBe('这个系统很可靠');
      expect(sanitizeResponse('按规范操作')).toBe('按规范操作');
      expect(sanitizeResponse('操心太多')).toBe('操心太多');
    });

    it('sanitizeResponse replaces other vulgar words with ***', () => {
      expect(sanitizeResponse('这个人太垃圾了')).toBe('这个人太***了');
      expect(sanitizeResponse('真特么烦人')).toBe('真***烦人');
      expect(sanitizeResponse('别傻逼了')).toBe('别***了');
      expect(sanitizeResponse('真是装逼')).toBe('真是***');
    });

    it('handles multiple occurrences and complex sentences', () => {
      const input = '卧槽，靠北！这个人真是傻逼，太特么垃圾了，卧槽！';
      const output = sanitizeResponse(input);
      expect(output).toBe('天哪，天哪！这个人真是***，太******了，天哪！');
      expect(containsProhibitedWords(output)).toBe(false);
      expect(output).not.toContain('卧槽');
    });

    it('handles edge case inputs (empty, space, special characters, unicode)', () => {
      expect(sanitizeResponse('')).toBe('');
      expect(sanitizeResponse('   ')).toBe('   ');
      expect(sanitizeResponse('😀🎉👍')).toBe('😀🎉👍');
      expect(sanitizeResponse('Clean message with no vulgarity.')).toBe('Clean message with no vulgarity.');
    });

    it('guarantees zero "卧槽" in output even under repeated adversarial concatenations', () => {
      const adversarialStrings = [
        '卧槽',
        '卧槽卧槽',
        '【卧槽】',
        '“卧槽”',
        '!!!卧槽???',
        '卧槽，今天天气卧槽，真特么卧槽',
      ];

      for (const str of adversarialStrings) {
        const sanitized = sanitizeResponse(str);
        expect(sanitized).not.toContain('卧槽');
        expect(containsProhibitedWords(sanitized)).toBe(false);
      }
    });
  });
});
