export interface IInstrumentMetrics {
  instrumentId: number;
  symbol: string;
  lastTradePriceCents: number | null;
  spreadCents: number | null;
  volume: number;
  vwapCents: number | null;
  imbalance: number | null;
}
