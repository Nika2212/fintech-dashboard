import { beforeEach, describe, expect, it, vi } from 'vitest';

type RandomModule = typeof import('../assembly/random');

describe('random (xorshift32)', () => {
  let random: RandomModule;

  beforeEach(async () => {
    vi.resetModules();
    random = await import('../assembly/random');
  });

  it('follows the xorshift32 sequence', () => {
    random.seedRandom(1);
    expect(random.nextU32()).toBe(270369);
    expect(random.nextU32()).toBe(67634689);
  });

  it('replaces seed 0 with the fallback seed', () => {
    random.seedRandom(random.FALLBACK_SEED);
    const expected = [random.nextU32(), random.nextU32()];
    random.seedRandom(0);
    expect([random.nextU32(), random.nextU32()]).toEqual(expected);
  });

  it('uses the fallback seed before seedRandom() is called', () => {
    const unseeded = random.nextU32();
    random.seedRandom(random.FALLBACK_SEED);
    expect(random.nextU32()).toBe(unseeded);
  });

  it('always returns unsigned 32-bit integers', () => {
    random.seedRandom(123);
    for (let i = 0; i < 10000; i++) {
      const n = random.nextU32();
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it('nextInt() stays within [0, bound)', () => {
    random.seedRandom(9);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const n = random.nextInt(7);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(7);
      seen.add(n);
    }
    expect(seen.size).toBe(7);
  });

  it('nextInt(1) is always 0', () => {
    random.seedRandom(5);
    for (let i = 0; i < 100; i++) expect(random.nextInt(1)).toBe(0);
  });

  it('nextBool() returns both values', () => {
    random.seedRandom(3);
    const values = new Set<boolean>();
    for (let i = 0; i < 100; i++) values.add(random.nextBool());
    expect(values).toEqual(new Set([true, false]));
  });
});
