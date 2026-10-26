/// <reference lib="webworker" />

import {IWorkerRequest} from '../../shared/interfaces/worker-request.interface';
import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {validateCommand, validateSettings} from '../utils/producer-settings-validator.util';
import {IValidationResponse} from '../../shared/interfaces/validation-response.interface';
import {IWorkerResponse} from '../../shared/interfaces/worker-response.interface';
import {WorkerStateTypes} from '../enums/worker-state-types.enum';
import {PRE_RUN_ID} from '../constants/defaults.constant';

let LAST_COMMAND: WorkerCommands;
let LAST_SETTINGS: IProducerSettings;
let LAST_RUN_ID: number = PRE_RUN_ID;

let TIMER: number | null = null;

addEventListener('message', (event: MessageEvent<IWorkerRequest>) => {
  const actionValidation: IValidationResponse = validateCommand(event.data.command);

  // TODO : - Wrap into single entity checking
  if (!actionValidation.isValid) {
    return handleError(actionValidation.message);
  }

  if (!LAST_SETTINGS && !event.data.settings) {
    return handleError('No settings were provided');
  }

  if (event.data.settings) {
    const settingsValidation: IValidationResponse = validateSettings(event.data.settings);

    if (!settingsValidation.isValid) {
      return handleError(actionValidation.message);
    }

    LAST_SETTINGS = event.data.settings;
  }

  LAST_COMMAND = event.data.command;

  switch (LAST_COMMAND) {
    case WorkerCommands.APPLY: onApply(); break;
    case WorkerCommands.PAUSE: onPause(); break;
    case WorkerCommands.RESUME: onResume(); break;
  }
});

function dispatchEvent(event: IWorkerResponse): void {
  return postMessage(event);
}

function onApply(): void {
  console.log('Apply');
  LAST_RUN_ID++;

  if (TIMER) {
    clearInterval(TIMER);
  }

  run();
}

function onPause(): void {
  console.log('Pause');

  if (TIMER) {
    clearInterval(TIMER);
  }
}

function onResume(): void {
  console.log('Resume');
  run();
}

function run(): void {
  requestBatchUpdate(LAST_SETTINGS);
  TIMER = setInterval(() => requestBatchUpdate(LAST_SETTINGS), LAST_SETTINGS.batchInterval);
}

function requestBatchUpdate(settings: IProducerSettings): void {
  console.log('requestBatchUpdate', settings);
}

function handleError(message: string): void {
  if (TIMER) {
    clearInterval(TIMER);
  }

  return dispatchEvent({runId: LAST_RUN_ID, state: WorkerStateTypes.FAILED, message: message});
}
