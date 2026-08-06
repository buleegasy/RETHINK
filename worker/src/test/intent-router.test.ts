import { describe, it, expect } from 'vitest';
import { classifyIntentRules } from '../lib/intent-router';

describe('Intent Router', () => {
  describe('classifyIntentRules', () => {
    it('should handle empty input', () => {
      const res = classifyIntentRules('');
      expect(res.type).toBe('casual');
      expect(res.confidence).toBe(1.0);
    });

    it('should detect crisis intent', () => {
      const res = classifyIntentRules('我真的不想活了');
      expect(res.type).toBe('crisis');
      expect(res.confidence).toBe(1.0);
    });

    it('should detect source_trace intent', () => {
      const res = classifyIntentRules('你有什么依据吗');
      expect(res.type).toBe('source_trace');
    });

    it('should detect family_pressure', () => {
      const res = classifyIntentRules('我爸妈总是骂我');
      expect(res.type).toBe('family_pressure');
    });

    it('should detect peer_relationship', () => {
      const res = classifyIntentRules('同学都在背后笑我');
      expect(res.type).toBe('peer_relationship');
    });

    it('should detect academic_stress', () => {
      const res = classifyIntentRules('这次考试我又考砸了');
      expect(res.type).toBe('academic_stress');
    });

    it('should detect emotional intent and anxiety emotion', () => {
      const res = classifyIntentRules('我感到非常焦虑和害怕');
      expect(res.type).toBe('emotional');
      expect(res.emotion).toBe('Anxiety');
    });

    it('should detect casual intent', () => {
      const res = classifyIntentRules('你好，今天天气不错');
      expect(res.type).toBe('casual');
    });

    it('should fallback to ambiguous', () => {
      const res = classifyIntentRules('随便吧，我也说不清');
      // "随便" is not clearly emotional but has some weight or no weight depending on triggers
      // Wait, let's just use some text without clear keywords
      const res2 = classifyIntentRules('今天中午吃什么');
      // eating is in casual pattern
      const res3 = classifyIntentRules('不知道该怎么做'); // Should be ambiguous
      expect(res3.type).toBe('ambiguous');
    });
  });
});
