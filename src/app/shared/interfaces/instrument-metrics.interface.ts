export interface IInstrumentMetrics {
  instrumentId: number;
  lastTradePriceCents: number | null;
  spreadCents: number | null;
  volume: number;
  vwapCents: number | null;
  imbalance: number | null;
}
