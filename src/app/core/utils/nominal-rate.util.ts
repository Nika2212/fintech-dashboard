const MS_PER_SECOND: number = 1_000;

export function nominalUpdatesPerSecond(updatesPerBatch: number, batchIntervalMs: number): number {
  return Math.round((updatesPerBatch * MS_PER_SECOND) / batchIntervalMs);
}
