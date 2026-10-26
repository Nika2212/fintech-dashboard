import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';

export const PRE_RUN_ID: number = 0;

export const SETTINGS_DEFAULT_INSTRUMENT_COUNT: number = 5;
export const SETTINGS_DEFAULT_UPDATE_INTERVAL: number = 500;
export const SETTINGS_DEFAULT_UPDATE_PACKAGE: number = 100;
export const SETTINGS_DEFAULT: IProducerSettings = {
  instrumentCount: SETTINGS_DEFAULT_INSTRUMENT_COUNT,
  updatesPerBatch: SETTINGS_DEFAULT_UPDATE_PACKAGE,
  batchInterval: SETTINGS_DEFAULT_UPDATE_INTERVAL,
};

