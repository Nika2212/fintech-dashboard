/// <reference lib="webworker" />

import {IWorkerRequest} from '../../shared/interfaces/worker-request.interface';
import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {validateCommand, validateSettings} from '../utils/producer-settings-validator.util';
import {IValidationResponse} from '../../shared/interfaces/validation-response.interface';
import {IWorkerResponse} from '../../shared/interfaces/worker-response.interface';
import {WorkerStateTypes} from '../enums/worker-state-types.enum';
import {PRE_RUN_ID} from '../constants/defaults.constant';
import { instantiate } from '../../../../wasm/build/market-generator.js';

type MarketGenerator = Awaited<ReturnType<typeof instantiate>>;

let LAST_COMMAND: WorkerCommands;
let LAST_SETTINGS: IProducerSettings;
let LAST_RUN_ID: number = PRE_RUN_ID;
let TIMER: number | null = null;

const generatorReady: Promise<MarketGenerator> = loadGenerator();

async function loadGenerator(): Promise<MarketGenerator> {
  const url = new URL('wasm/market-generator.wasm', self.location.href);
  const module = await WebAssembly.compileStreaming(fetch(url));
  return instantiate(module, { env: {} });
}

let generator: MarketGenerator | null = null;

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

async function onApply(): Promise<void> {
  console.log('Apply');
  LAST_RUN_ID++;

  if (TIMER) {
    clearInterval(TIMER);
  }

  const currentRunId: number = LAST_RUN_ID;

  try {
    const loaded = await generatorReady;

    if (currentRunId !== LAST_RUN_ID) return;

    loaded.init(LAST_SETTINGS.instrumentCount, crypto.getRandomValues(new Uint32Array(1))[0]);
    generator = loaded;

    run();
  } catch (error) {
    handleError(error instanceof Error ? error.message : 'Failed to load the market generator');
  }
}

function onPause(): void {
  console.log('Pause');

  if (TIMER !== null) {
    clearInterval(TIMER);
    TIMER = null;
  }
}

function onResume(): void {
  console.log('Resume');
  if (TIMER === null) {
    return;
  }

  run();
}

function run(): void {
  requestBatchUpdate(LAST_SETTINGS);
  TIMER = setInterval(() => requestBatchUpdate(LAST_SETTINGS), LAST_SETTINGS.batchInterval);
}

function requestBatchUpdate(settings: IProducerSettings): void {
  console.log('requestBatchUpdate', settings);
  if (!generator) {
    return;
  }

  const batch = generator.generateBatch(settings.updatesPerBatch);

  console.log('batch', batch);
}

function handleError(message: string): void {
  if (TIMER) {
    clearInterval(TIMER);
  }

  return dispatchEvent({runId: LAST_RUN_ID, state: WorkerStateTypes.FAILED, message: message});
}
