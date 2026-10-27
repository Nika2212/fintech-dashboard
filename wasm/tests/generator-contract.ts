import { beforeEach, describe, expect, it } from 'vitest';
import { decode, FIELDS, GeneratorApi, MarketUpdate } from './generator-api';

/**
 * Behaviour every build of the generator must have. Run against both the
 * compiled Wasm module and the portable TypeScript build.
 */
export function generatorContract(name: string, load: () => Promise<GeneratorApi>): void {
  describe(`${name}: market generator contract`, () => {
    let gen: GeneratorApi;

    beforeEach(async () => {
      gen = await load();
    });

    describe('layout and limits', () => {
      it('describes each update with 7 integers', () => {
        expect(gen.fieldsPerUpdate()).toBe(FIELDS);
      });

      it('exposes the configured limits', () => {
        expect(gen.maxInstruments()).toBe(50);
        expect(gen.maxBatchSize()).toBe(1000);
      });
    });

    describe('input validation', () => {
      it('refuses to generate before init()', () => {
        expect(() => gen.generateBatch(10)).toThrow(/init\(\) must be called/);
      });

      it.each([0, -1, 51])('rejects instrument count %i', (count) => {
        expect(() => gen.init(count, 1)).toThrow(/InstrumentCount must be/);
      });

      it.each([1, 50])('accepts instrument count %i', (count) => {
        expect(() => gen.init(count, 1)).not.toThrow();
      });

      it.each([0, -5, 1001])('rejects batch size %i', (size) => {
        gen.init(5, 1);
        expect(() => gen.generateBatch(size)).toThrow(/batch size must be/);
      });

      it('keeps working after a rejected call', () => {
        gen.init(5, 1);
        expect(() => gen.generateBatch(0)).toThrow();
        expect(gen.generateBatch(3)).toHaveLength(3 * FIELDS);
      });
    });

    describe('batch size', () => {
      it.each([1, 7, 100, 1000])('returns exactly %i updates', (size) => {
        gen.init(5, 42);
        expect(gen.generateBatch(size)).toHaveLength(size * FIELDS);
      });

      it('returns an Int32Array', () => {
        gen.init(5, 42);
        expect(gen.generateBatch(10)).toBeInstanceOf(Int32Array);
      });
    });

    describe('generated values', () => {
      let updates: MarketUpdate[];

      beforeEach(() => {
        gen.init(50, 2024);
        updates = [];
        for (let i = 0; i < 50; i++) updates.push(...decode(gen.generateBatch(1000)));
      });

      it('only uses instruments that exist', () => {
        for (const u of updates) {
          expect(u.instrumentId).toBeGreaterThanOrEqual(0);
          expect(u.instrumentId).toBeLessThan(50);
        }
      });

      it('keeps prices positive and the bid below the ask', () => {
        for (const u of updates) {
          expect(u.bidPriceCents).toBeGreaterThanOrEqual(1);
          expect(u.askPriceCents).toBeGreaterThan(u.bidPriceCents);
        }
      });

      it('trades at either the bid or the ask of the same update', () => {
        for (const u of updates) {
          expect([u.bidPriceCents, u.askPriceCents]).toContain(u.tradePriceCents);
        }
      });

      it('produces trades on both sides of the book', () => {
        expect(updates.some((u) => u.tradePriceCents === u.bidPriceCents)).toBe(true);
        expect(updates.some((u) => u.tradePriceCents === u.askPriceCents)).toBe(true);
      });

      it('keeps trade quantities in [1, 100]', () => {
        for (const u of updates) {
          expect(u.tradeQuantity).toBeGreaterThanOrEqual(1);
          expect(u.tradeQuantity).toBeLessThanOrEqual(100);
        }
      });

      it('keeps book quantities in [0, 1000]', () => {
        for (const u of updates) {
          for (const q of [u.bidQuantity, u.askQuantity]) {
            expect(q).toBeGreaterThanOrEqual(0);
            expect(q).toBeLessThanOrEqual(1000);
          }
        }
      });

      it('lets an instrument appear more than once in a batch', () => {
        const firstBatch = updates.slice(0, 1000).map((u) => u.instrumentId);
        expect(new Set(firstBatch).size).toBeLessThan(firstBatch.length);
      });

      it('eventually updates every instrument', () => {
        expect(new Set(updates.map((u) => u.instrumentId)).size).toBe(50);
      });
    });

    describe('state between calls', () => {
      it('moves each bid by a small step from its previous value, across batches', () => {
        gen.init(5, 7);
        const lastBid = new Map<number, number>();
        for (let batch = 0; batch < 20; batch++) {
          for (const u of decode(gen.generateBatch(100))) {
            const prev = lastBid.get(u.instrumentId);
            if (prev !== undefined) {
              const maxStep = 1 + Math.trunc(prev / 2000);
              expect(Math.abs(u.bidPriceCents - prev)).toBeLessThanOrEqual(maxStep);
            }
            lastBid.set(u.instrumentId, u.bidPriceCents);
          }
        }
        expect(lastBid.size).toBe(5);
      });

      it('starts every instrument between $10 and $1,000', () => {
        gen.init(50, 99);
        const firstSeen = new Map<number, number>();
        for (const u of decode(gen.generateBatch(1000))) {
          if (!firstSeen.has(u.instrumentId)) firstSeen.set(u.instrumentId, u.bidPriceCents);
        }
        for (const bid of firstSeen.values()) {
          expect(bid).toBeGreaterThanOrEqual(1000 - 6);
          expect(bid).toBeLessThan(100000 + 51);
        }
      });

      it('init() discards the previous run', () => {
        gen.init(5, 123);
        const first = gen.generateBatch(50);
        gen.generateBatch(500);
        gen.init(5, 123);
        expect(gen.generateBatch(50)).toEqual(first);
      });

      it('respects a smaller instrument count after re-init', () => {
        gen.init(50, 5);
        gen.generateBatch(100);
        gen.init(2, 5);
        for (const u of decode(gen.generateBatch(500))) {
          expect(u.instrumentId).toBeLessThan(2);
        }
      });
    });

    describe('determinism', () => {
      it('produces the same data for the same seed', async () => {
        gen.init(10, 31337);
        const a = [gen.generateBatch(200), gen.generateBatch(200)];
        const other = await load();
        other.init(10, 31337);
        expect([other.generateBatch(200), other.generateBatch(200)]).toEqual(a);
      });

      it('produces different data for different seeds', () => {
        gen.init(10, 1);
        const a = gen.generateBatch(100);
        gen.init(10, 2);
        expect(gen.generateBatch(100)).not.toEqual(a);
      });

      it('handles seed 0 and seeds above 2^31', () => {
        gen.init(5, 0);
        const zero = decode(gen.generateBatch(100));
        expect(new Set(zero.map((u) => u.bidPriceCents)).size).toBeGreaterThan(1);

        gen.init(5, 0xffffffff);
        expect(gen.generateBatch(10)).toHaveLength(10 * FIELDS);
      });
    });
  });
}
