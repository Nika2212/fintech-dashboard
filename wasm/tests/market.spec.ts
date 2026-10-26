import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decode, FIELDS } from './generator-api';

type MarketModule = typeof import('../assembly/market');
type RandomModule = typeof import('../assembly/random');

describe('market model', () => {
  let market: MarketModule;
  let random: RandomModule;

  beforeEach(async () => {
    vi.resetModules();
    random = await import('../assembly/random');
    market = await import('../assembly/market');
    random.seedRandom(11);
  });

  describe('clampPrice()', () => {
    it.each([
      [-50, 1],
      [0, 1],
      [1, 1],
      [12345, 12345],
      [10000000, 10000000],
      [10000001, 10000000],
    ])('clamps %i to %i', (input, expected) => {
      expect(market.clampPrice(input)).toBe(expected);
    });
  });

  describe('maxStepCents()', () => {
    it.each([
      [1, 1],
      [1999, 1],
      [2000, 2],
      [10000, 6],
      [100000, 51],
    ])('allows a step of %i cents at bid %i', (bid, expected) => {
      expect(market.maxStepCents(bid)).toBe(expected);
    });
  });

  describe('maxSpreadCents()', () => {
    it.each([
      [1, 1],
      [4999, 1],
      [5000, 2],
      [100000, 21],
    ])('allows a spread of %i cents at bid %i', (bid, expected) => {
      expect(market.maxSpreadCents(bid)).toBe(expected);
    });
  });

  describe('resetMarket()', () => {
    it('starts with no instruments', () => {
      expect(market.instrumentCount()).toBe(0);
    });

    it('creates the requested number of instruments', () => {
      market.resetMarket(12);
      expect(market.instrumentCount()).toBe(12);
    });
  });

  describe('writeUpdate()', () => {
    it('writes exactly 7 fields at the given offset', () => {
      market.resetMarket(3);
      const out = new Int32Array(3 * FIELDS).fill(-1);
      market.writeUpdate(out, FIELDS);

      expect(Array.from(out.subarray(0, FIELDS))).toEqual(Array(FIELDS).fill(-1));
      expect(Array.from(out.subarray(2 * FIELDS))).toEqual(Array(FIELDS).fill(-1));
      expect(out.subarray(FIELDS, 2 * FIELDS).every((v) => v !== -1)).toBe(true);
    });

    it('updates the stored state of the instrument it reports', () => {
      market.resetMarket(1);
      const out = new Int32Array(2 * FIELDS);
      market.writeUpdate(out, 0);
      market.writeUpdate(out, FIELDS);
      const [first, second] = decode(out);
      const maxStep = market.maxStepCents(first.bidPriceCents);
      expect(Math.abs(second.bidPriceCents - first.bidPriceCents)).toBeLessThanOrEqual(maxStep);
    });
  });
});
