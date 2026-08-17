import { describe, it, expect } from 'vitest';
import { timingSafeEqual } from '../lib/auth-utils';

describe('auth-utils', () => {
  describe('timingSafeEqual', () => {
    it('returns true for identical strings', () => {
      expect(timingSafeEqual('a', 'a')).toBe(true);
      expect(timingSafeEqual('abc', 'abc')).toBe(true);
      expect(timingSafeEqual('hello world', 'hello world')).toBe(true);
    });

    it('returns false for strings of different lengths', () => {
      expect(timingSafeEqual('a', 'ab')).toBe(false);
      expect(timingSafeEqual('abc', 'ab')).toBe(false);
      expect(timingSafeEqual('', 'a')).toBe(false);
    });

    it('returns false for strings of the same length but different content', () => {
      expect(timingSafeEqual('abc', 'abd')).toBe(false);
      expect(timingSafeEqual('abcd', 'abdc')).toBe(false);
      expect(timingSafeEqual('A', 'a')).toBe(false);
    });

    it('returns false if either argument is not a string', () => {
      expect(timingSafeEqual(undefined, 'abc')).toBe(false);
      expect(timingSafeEqual('abc', undefined)).toBe(false);
      expect(timingSafeEqual(undefined, undefined)).toBe(false);
    });
  });
});
