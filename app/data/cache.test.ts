import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BoundedCache } from './cache';

describe('BoundedCache', () => {
  it('stores and retrieves values', () => {
    const cache = new BoundedCache<number>(10);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  it('evicts the least-recently-used entry past capacity', () => {
    const cache = new BoundedCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('treats a read as a use, protecting it from eviction', () => {
    const cache = new BoundedCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    // Touch 'a' so 'b' becomes least-recently-used.
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('never grows beyond the max entry count', () => {
    const cache = new BoundedCache<number>(100);
    for (let i = 0; i < 10_000; i++) {
      cache.set(`key-${i}`, i);
    }
    let live = 0;
    for (let i = 0; i < 10_000; i++) {
      if (cache.has(`key-${i}`)) live++;
    }
    expect(live).toBe(100);
  });

  describe('ttl', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('expires entries after their ttl', () => {
      const cache = new BoundedCache<number>(10);
      cache.set('a', 1, 1_000);
      expect(cache.get('a')).toBe(1);
      vi.advanceTimersByTime(1_001);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.has('a')).toBe(false);
    });

    it('caps ttl at the one-hour ceiling so one-off keys still expire', () => {
      const cache = new BoundedCache<number>(10);
      // Request a year-long ttl, as github-data does for commit times.
      cache.set('a', 1, 365 * 24 * 60 * 60 * 1_000);
      vi.advanceTimersByTime(60 * 60 * 1_000 + 1);
      expect(cache.get('a')).toBeUndefined();
    });

    it('defaults to the ceiling when no ttl is given', () => {
      const cache = new BoundedCache<number>(10);
      cache.set('a', 1);
      vi.advanceTimersByTime(60 * 60 * 1_000 - 1);
      expect(cache.get('a')).toBe(1);
      vi.advanceTimersByTime(2);
      expect(cache.get('a')).toBeUndefined();
    });
  });
});
