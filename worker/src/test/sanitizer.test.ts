import { describe, it, expect } from 'vitest';
import { containsProhibitedWords, sanitizeResponse, getEmittableAndBuffer, PROHIBITED_WORDS } from '../lib/sanitizer';
import { getPromptForState, RECEPTIONIST_GREETING_CANDIDATES, type FSMState } from '../lib/fsm';

describe('Sanitizer & Tone Quality (Requirement R4)', () => {
  describe('containsProhibitedWords', () => {
    it('should return true when text contains prohibited words', () => {
      expect(containsProhibitedWords('卧槽，这简直太令人惊讶了')).toBe(true);
      expect(containsProhibitedWords('这真的太傻逼了')).toBe(true);
      expect(containsProhibitedWords('真的是他妈的崩溃')).toBe(true);
    });

    it('should return false when text is clean and professional', () => {
      expect(containsProhibitedWords('天哪，这也太让人糟心了吧')).toBe(false);
      expect(containsProhibitedWords('你好呀！今天过得怎么样？')).toBe(false);
      expect(containsProhibitedWords('感谢你的分享，我一直在这里陪着你')).toBe(false);
    });

    it('should handle empty or undefined input gracefully', () => {
      expect(containsProhibitedWords('')).toBe(false);
      expect(containsProhibitedWords(null as any)).toBe(false);
      expect(containsProhibitedWords(undefined as any)).toBe(false);
    });
  });

  describe('getEmittableAndBuffer', () => {
    it('should hold back trailing prohibited word prefix when isEnd is false', () => {
      const res = getEmittableAndBuffer('今天天气挺好，但是卧', false);
      expect(res).toEqual({
        emittable: '今天天气挺好，但是',
        buffer: '卧',
      });
    });

    it('should emit full text when isEnd is true', () => {
      const res = getEmittableAndBuffer('今天天气挺好，但是卧', true);
      expect(res).toEqual({
        emittable: '今天天气挺好，但是卧',
        buffer: '',
      });
    });

    it('should return empty buffer when text contains no prohibited word prefix', () => {
      const res = getEmittableAndBuffer('今天天气挺好，但是天气不错', false);
      expect(res).toEqual({
        emittable: '今天天气挺好，但是天气不错',
        buffer: '',
      });
    });
  });

  describe('sanitizeResponse', () => {
    it('should replace "卧槽" and "靠北" with "天哪"', () => {
      expect(sanitizeResponse('卧槽，这也太难了吧')).toBe('天哪，这也太难了吧');
      expect(sanitizeResponse('靠北，我也太倒霉了')).toBe('天哪，我也太倒霉了');
    });

    it('should not mutate legitimate vocabulary such as "依靠", "可靠", "操作", "操心", "操场", "体操"', () => {
      expect(sanitizeResponse('我们需要相互依靠')).toBe('我们需要相互依靠');
      expect(sanitizeResponse('这个方案非常可靠')).toBe('这个方案非常可靠');
      expect(sanitizeResponse('请按步骤操作')).toBe('请按步骤操作');
      expect(sanitizeResponse('不用太操心了')).toBe('不用太操心了');
      expect(sanitizeResponse('大家在操场锻炼')).toBe('大家在操场锻炼');
      expect(sanitizeResponse('他表演了自由体操')).toBe('他表演了自由体操');
    });

    it('should replace other prohibited words with ***', () => {
      expect(sanitizeResponse('这个人真是傻逼')).toBe('这个人真是***');
      expect(sanitizeResponse('真是他妈太烦了')).toBe('真是***太烦了');
    });

    it('should leave clean text unchanged', () => {
      const clean = '今天天气不错，我们聊聊吧！';
      expect(sanitizeResponse(clean)).toBe(clean);
    });

    it('should perform hold-back buffer SSE delta sanitization across split-chunk boundaries without leaking prohibited words or prefixes', () => {
      const chunks = ['今天天气挺好，但是卧', '槽也太倒霉了'];
      let streamBuffer = '';
      const emittedDeltas: string[] = [];

      for (const trueDelta of chunks) {
        const combined = streamBuffer + trueDelta;
        const sanitizedCombined = sanitizeResponse(combined);
        const { emittable, buffer: newBuffer } = getEmittableAndBuffer(sanitizedCombined, false);
        streamBuffer = newBuffer;
        if (emittable.length > 0) {
          emittedDeltas.push(emittable);
        }
      }

      if (streamBuffer.length > 0) {
        const finalChunk = sanitizeResponse(streamBuffer);
        if (finalChunk.length > 0) emittedDeltas.push(finalChunk);
      }

      const clientReconstructed = emittedDeltas.join('');
      expect(clientReconstructed).toBe('今天天气挺好，但是天哪也太倒霉了');
      expect(emittedDeltas[0]).toBe('今天天气挺好，但是');
      expect(emittedDeltas[0]).not.toContain('卧');
      expect(containsProhibitedWords(clientReconstructed)).toBe(false);
    });
  });

  describe('Receptionist Greeting Diversity & Prompt Integrity', () => {
    it('should export at least 5 diverse receptionist greeting candidates', () => {
      expect(Array.isArray(RECEPTIONIST_GREETING_CANDIDATES)).toBe(true);
      expect(RECEPTIONIST_GREETING_CANDIDATES.length).toBeGreaterThanOrEqual(5);

      const uniqueSet = new Set(RECEPTIONIST_GREETING_CANDIDATES);
      expect(uniqueSet.size).toBe(RECEPTIONIST_GREETING_CANDIDATES.length);

      for (const greeting of RECEPTIONIST_GREETING_CANDIDATES) {
        expect(greeting.length).toBeGreaterThan(10);
        expect(containsProhibitedWords(greeting)).toBe(false);
        expect(greeting).toMatch(/称呼|名字|昵称/);
      }
    });

    it('should ensure all FSM state prompts contain zero prohibited words', () => {
      const states: FSMState[] = [
        'Pre_Info_Collection',
        'Onboarding',
        'Active_Listening',
        'CBT_Stripping',
        'Socratic_Questioning',
        'Crisis_Escalation',
      ];

      for (const state of states) {
        const prompt = getPromptForState(state);
        expect(containsProhibitedWords(prompt)).toBe(false);
        for (const word of PROHIBITED_WORDS) {
          expect(prompt).not.toContain(word);
        }
      }
    });
  });
});
