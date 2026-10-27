import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {
  MAX_UPDATES_PER_BATCH,
  MAX_INSTRUMENT_COUNT,
  MAX_BATCH_INTERVAL_MS,
  MIN_INSTRUMENT_COUNT,
  MIN_BATCH_INTERVAL_MS, MIN_UPDATES_PER_BATCH
} from '../constants/defaults.constant';
import {IValidation} from '../../shared/interfaces/validation.interface';

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isInteger(value: number): boolean {
  return Number.isInteger(value);
}

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

    return validation;
  }

  if (!inRange(settings.batchIntervalMs, MIN_BATCH_INTERVAL_MS, MAX_BATCH_INTERVAL_MS) || !isInteger(settings.batchIntervalMs)) {
    validation.isValid = false;
    validation.message = `Batch interval should be integer and in range ${MIN_BATCH_INTERVAL_MS}ms - ${MAX_BATCH_INTERVAL_MS}ms`;

    return validation;
  }

  if (!inRange(settings.instrumentCount, MIN_INSTRUMENT_COUNT, MAX_INSTRUMENT_COUNT) || !isInteger(settings.instrumentCount)) {
    validation.isValid = false;
    validation.message = `Instrument count should be integer and in range ${MIN_INSTRUMENT_COUNT} - ${MAX_INSTRUMENT_COUNT}`;

    return validation;
  }

  if (!inRange(settings.updatesPerBatch, MIN_UPDATES_PER_BATCH, MAX_UPDATES_PER_BATCH) || !isInteger(settings.updatesPerBatch)) {
    validation.isValid = false;
    validation.message = `Updates per batch should be integer and in range ${MIN_UPDATES_PER_BATCH} - ${MAX_UPDATES_PER_BATCH}`;

    return validation;
  }

  return validation;
}
