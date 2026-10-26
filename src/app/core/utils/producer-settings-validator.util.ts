import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {
  SETTINGS_MAX_BATCH_PACKAGE,
  SETTINGS_MAX_INSTRUMENT_COUNT,
  SETTINGS_MAX_UPDATE_INTERVAL, SETTINGS_MIN_BATCH_PACKAGE,
  SETTINGS_MIN_INSTRUMENT_COUNT,
  SETTINGS_MIN_UPDATE_INTERVAL
} from '../constants/ruleset.constant';
import {SETTINGS_DEFAULT_UPDATE_INTERVAL} from '../constants/defaults.constant';
import {IValidationResponse} from '../../shared/interfaces/validation-response.interface';

export function validateCommand(command: WorkerCommands): IValidationResponse {
  const validation: IValidationResponse = {
    isValid: true,
    message: ''
  };

  if (!Object.values(WorkerCommands).includes(command)) {
    validation.isValid = false;
    validation.message = 'Invalid command type';
  }

  return validation;
}

export function validateSettings(settings: IProducerSettings): IValidationResponse {
  const validation: IValidationResponse = {
    isValid: true,
    message: ''
  };

  if (!settings) {
    validation.isValid = false;
    validation.message = 'Producer Settings are empty';
  }

  if (!settings.batchInterval || settings.batchInterval < SETTINGS_MIN_UPDATE_INTERVAL || settings.batchInterval > SETTINGS_MAX_UPDATE_INTERVAL) {
    validation.isValid = false;
    validation.message = `Update interval should be in range ${SETTINGS_MIN_UPDATE_INTERVAL}ms - ${SETTINGS_MAX_UPDATE_INTERVAL}ms`;
  }

  if (!settings.instrumentCount || settings.instrumentCount < SETTINGS_MIN_INSTRUMENT_COUNT || settings.instrumentCount > SETTINGS_MAX_INSTRUMENT_COUNT) {
    validation.isValid = false;
    validation.message = `Instrument count should be in range ${SETTINGS_MIN_INSTRUMENT_COUNT} - ${SETTINGS_MAX_INSTRUMENT_COUNT}`;
  }

  if (!settings.updatesPerBatch || settings.updatesPerBatch < SETTINGS_MIN_BATCH_PACKAGE || settings.updatesPerBatch > SETTINGS_MAX_BATCH_PACKAGE) {
    validation.isValid = false;
    validation.message = `Per update items count should be in range ${SETTINGS_MIN_BATCH_PACKAGE} - ${SETTINGS_MAX_BATCH_PACKAGE}`;
  }

  return validation;
}
