import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {
  MAX_UPDATES_PER_BATCH,
  MAX_INSTRUMENT_COUNT,
  MAX_BATCH_INTERVAL_MS,
  MIN_INSTRUMENT_COUNT,
  MIN_BATCH_INTERVAL_MS, MIN_UPDATES_PER_BATCH
} from '../constants/defaults.constant';
import {DEFAULT_BATCH_INTERVAL_MS} from '../constants/defaults.constant';
import {IValidation} from '../../shared/interfaces/validation.interface';

export function validateCommand(command: WorkerCommands): IValidation {
  const validation: IValidation = {
    isValid: true,
    message: ''
  };

  if (!Object.values(WorkerCommands).includes(command)) {
    validation.isValid = false;
    validation.message = 'Invalid command type';
  }

  return validation;
}

export function validateSettings(settings: IProducerSettings): IValidation {
  const validation: IValidation = {
    isValid: true,
    message: ''
  };

  if (!settings) {
    validation.isValid = false;
    validation.message = 'Producer Settings are empty';
  }

  if (!settings.batchIntervalMs || settings.batchIntervalMs < MIN_BATCH_INTERVAL_MS || settings.batchIntervalMs > MAX_BATCH_INTERVAL_MS) {
    validation.isValid = false;
    validation.message = `Update interval should be in range ${MIN_BATCH_INTERVAL_MS}ms - ${MAX_BATCH_INTERVAL_MS}ms`;
  }

  if (!settings.instrumentCount || settings.instrumentCount < MIN_INSTRUMENT_COUNT || settings.instrumentCount > MAX_INSTRUMENT_COUNT) {
    validation.isValid = false;
    validation.message = `Instrument count should be in range ${MIN_INSTRUMENT_COUNT} - ${MAX_INSTRUMENT_COUNT}`;
  }

  if (!settings.updatesPerBatch || settings.updatesPerBatch < MIN_UPDATES_PER_BATCH || settings.updatesPerBatch > MAX_UPDATES_PER_BATCH) {
    validation.isValid = false;
    validation.message = `Per update items count should be in range ${MIN_UPDATES_PER_BATCH} - ${MAX_UPDATES_PER_BATCH}`;
  }

  return validation;
}
