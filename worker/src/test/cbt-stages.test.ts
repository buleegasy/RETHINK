import { describe, it, expect } from 'vitest';
import { detectStage, stageToIndex, indexToStage } from '../lib/cbt-stages';
import type { CBTStage } from '../types';

describe('CBT Stages', () => {
  describe('detectStage', () => {
    it('should detect 剥离事实 stage', () => {
      expect(detectStage('请描述一下事情经过', 0)).toBe('剥离事实');
    });

    it('should detect 捕获想法 stage', () => {
      expect(detectStage('你的想法是什么', 0)).toBe('捕获想法');
    });

    it('should detect 扫描漏洞 stage', () => {
      expect(detectStage('这个逻辑是否有漏洞', 0)).toBe('扫描漏洞');
    });

    it('should detect 证据质询 stage', () => {
      expect(detectStage('你有什么客观上的证据来证明这个结论', 0)).toBe('证据质询');
    });

    it('should detect 重构认知 stage', () => {
      expect(detectStage('让我们换一种视角看待问题', 0)).toBe('重构认知');
    });

    it('should maintain current stage if no keywords match', () => {
      expect(detectStage('一些无关的话', 2)).toBe('扫描漏洞');
    });

    it('should match higher stages first', () => {
      // "换一种视角" (重构认知) and "漏洞" (扫描漏洞)
      // "重构认知" has higher priority in detectStage
      expect(detectStage('这个漏洞可能需要换一种视角来看', 0)).toBe('重构认知');
    });
  });

  describe('stageToIndex and indexToStage', () => {
    it('should convert correctly', () => {
      expect(stageToIndex('剥离事实')).toBe(0);
      expect(stageToIndex('捕获想法')).toBe(1);
      expect(stageToIndex('扫描漏洞')).toBe(2);
      expect(stageToIndex('证据质询')).toBe(3);
      expect(stageToIndex('重构认知')).toBe(4);

      expect(indexToStage(0)).toBe('剥离事实');
      expect(indexToStage(4)).toBe('重构认知');
      expect(indexToStage(10)).toBe('重构认知');
      expect(indexToStage(-1)).toBe('剥离事实');
    });
  });
});
