export interface IInstrumentMetrics {
  instrumentId: number;
  lastTradePriceCents: number | null;
  spreadCents: number | null;
  volume: number | null;
  vwapCents: number | null;
  imbalance: number | null;
}
