import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';

export const PRE_RUN_ID: number = 0;

export const MIN_BATCH_INTERVAL_MS: number = 50;
export const MAX_BATCH_INTERVAL_MS: number = 2_000;
export const MIN_UPDATES_PER_BATCH: number = 1;
export const MAX_UPDATES_PER_BATCH: number = 1_000;
export const MIN_INSTRUMENT_COUNT: number = 1;
export const MAX_INSTRUMENT_COUNT: number = 50;
export const DEFAULT_INSTRUMENT_COUNT: number = 5;
export const DEFAULT_BATCH_INTERVAL_MS: number = 500;
export const DEFAULT_UPDATES_PER_BATCH: number = 100;
export const DEFAULT_SETTINGS: IProducerSettings = {
  instrumentCount: DEFAULT_INSTRUMENT_COUNT,
  updatesPerBatch: DEFAULT_UPDATES_PER_BATCH,
  batchIntervalMs: DEFAULT_BATCH_INTERVAL_MS,
};
export const FIELDS_PER_UPDATE: number = 7;
