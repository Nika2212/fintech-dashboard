import { describe, expect, it } from 'vitest';
import { createEmptyMetrics } from './instrument-metrics.util';

describe('createEmptyMetrics', () => {
  it('creates one row per instrument with unavailable values and zero volume', () => {
    expect(createEmptyMetrics(2)).toEqual([
      { instrumentId: 0, symbol: 'ALFA', lastTradePriceCents: null, spreadCents: null, volume: 0, vwapCents: null, imbalance: null },
      { instrumentId: 1, symbol: 'BETA', lastTradePriceCents: null, spreadCents: null, volume: 0, vwapCents: null, imbalance: null },
    ]);
  });

  it('creates no rows for zero instruments', () => {
    expect(createEmptyMetrics(0)).toEqual([]);
  });
});
