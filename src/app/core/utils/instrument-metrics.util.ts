import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';
import { INSTRUMENT_SYMBOLS } from '../constants/instrument-symbols.constant';

export function createEmptyMetrics(instrumentCount: number): IInstrumentMetrics[] {
  return Array.from({ length: instrumentCount }, (_, instrumentId: number) => ({
    instrumentId,
    symbol: INSTRUMENT_SYMBOLS[instrumentId],
    lastTradePriceCents: null,
    spreadCents: null,
    volume: 0,
    vwapCents: null,
    imbalance: null,
  }));
}
