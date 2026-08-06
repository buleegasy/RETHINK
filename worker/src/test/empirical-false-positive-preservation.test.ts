import { describe, it, expect } from 'vitest';
import { sanitizeResponse, containsProhibitedWords, getEmittableAndBuffer, PROHIBITED_WORDS } from '../lib/sanitizer';

describe('Empirical Verification: False Positive Preservation & Prohibited Word Sanitization (R4 - Challenger 1)', () => {
  const LEGITIMATE_WORDS = ['依靠', '可靠', '操作', '操心', '操场', '体操'];

  describe('1. Individual Word & Sentence Preservation', () => {
    it('MUST NEVER modify standalone legitimate words', () => {
      for (const word of LEGITIMATE_WORDS) {
        expect(sanitizeResponse(word)).toBe(word);
      }
    });

    it('MUST NEVER modify sentences containing "依靠"', () => {
      const cases = [
        '我们需要互相依靠，共同面对困难。',
        '做人要有自己的主见，不能全依靠别人。',
        '依靠科技进步推动产业创新发展。',
        '依靠',
      ];
      for (const text of cases) {
        expect(sanitizeResponse(text)).toBe(text);
      }
    });

    it('MUST NEVER modify sentences containing "可靠"', () => {
      const cases = [
        '这是一个非常可靠的心理学评估工具。',
        '他的承诺总是非常可靠。',
        '提供安全、可靠、高效的咨询服务。',
        '可靠',
      ];
      for (const text of cases) {
        expect(sanitizeResponse(text)).toBe(text);
      }
    });

    it('MUST NEVER modify sentences containing "操作"', () => {
      const cases = [
        '请按照屏幕提示进行后续操作。',
        '系统的底层操作逻辑非常严密。',
        '这项微习惯干预具有极高的可操作性。',
        '操作',
      ];
      for (const text of cases) {
        expect(sanitizeResponse(text)).toBe(text);
      }
    });

    it('MUST NEVER modify sentences containing "操心"', () => {
      const cases = [
        '父母总是为孩子的学业操心。',
        '别太操心了，一切都会好起来的。',
        '这件事情有大家帮忙，你不用操心。',
        '操心',
      ];
      for (const text of cases) {
        expect(sanitizeResponse(text)).toBe(text);
      }
    });

    it('MUST NEVER modify sentences containing "操场"', () => {
      const cases = [
        '晚自习结束后，同学们去操场跑步放松。',
        '在操场散步有助于缓解焦虑心理。',
        '学校的操场刚刚重新翻修过。',
        '操场',
      ];
      for (const text of cases) {
        expect(sanitizeResponse(text)).toBe(text);
      }
    });

    it('MUST NEVER modify sentences containing "体操"', () => {
      const cases = [
        '每天做十分钟广播体操可以调节自主神经。',
        '艺术体操是一项结合力量与美感运动。',
        '体操训练锻炼了她的毅力与自律。',
        '体操',
      ];
      for (const text of cases) {
        expect(sanitizeResponse(text)).toBe(text);
      }
    });

    it('MUST NEVER modify a complex sentence containing ALL six legitimate words simultaneously', () => {
      const complexSentence = '在操场上练习体操时，按照规范操作可以确保非常可靠，让我们彼此依靠而不必过于操心。';
      expect(sanitizeResponse(complexSentence)).toBe(complexSentence);
    });
  });

  describe('2. Prohibited Word Replacement for "卧槽"', () => {
    it('MUST replace standalone "卧槽" with "天哪"', () => {
      expect(sanitizeResponse('卧槽')).toBe('天哪');
    });

    it('MUST replace "卧槽" in various sentence contexts with "天哪"', () => {
      expect(sanitizeResponse('卧槽，这也太让人糟心了吧！')).toBe('天哪，这也太让人糟心了吧！');
      expect(sanitizeResponse('真是卧槽的情况啊')).toBe('真是天哪的情况啊');
      expect(sanitizeResponse('听到这个消息我直接卧槽')).toBe('听到这个消息我直接天哪');
      expect(sanitizeResponse('卧槽！卧槽！太离谱了！')).toBe('天哪！天哪！太离谱了！');
    });

    it('MUST NOT leave any residual "卧槽" in sanitized output', () => {
      const inputs = [
        '卧槽',
        '【卧槽】',
        '“卧槽”',
        '!!!卧槽???',
        '卧槽卧槽卧槽',
        '卧槽，今天天气卧槽，真特么卧槽',
      ];
      for (const input of inputs) {
        const result = sanitizeResponse(input);
        expect(result).not.toContain('卧槽');
      }
    });
  });

  describe('3. Mixed Adversarial Sentences', () => {
    it('MUST sanitize "卧槽" into "天哪" while preserving all six legitimate words untouched', () => {
      const input = '卧槽，这个操作太可靠了，完全不用操心，我们依靠体操在操场上展现风采！';
      const expected = '天哪，这个操作太可靠了，完全不用操心，我们依靠体操在操场上展现风采！';
      
      const output = sanitizeResponse(input);
      expect(output).toBe(expected);
      for (const word of LEGITIMATE_WORDS) {
        expect(output).toContain(word);
      }
      expect(output).not.toContain('卧槽');
    });
  });

  describe('4. SSE Streaming Chunk Delta Reconstruction', () => {
    it('preserves legitimate words across streaming chunk boundaries', () => {
      const chunks = ['我们需要', '相互', '依靠', '；方案非常', '可靠', '，请安心', '操作', '。'];
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

      const reconstructed = emittedDeltas.join('');
      expect(reconstructed).toBe('我们需要相互依靠；方案非常可靠，请安心操作。');
    });
  });
});
