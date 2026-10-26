/// <reference lib="webworker" />

import {IWorkerRequest} from '../../shared/interfaces/worker-request.interface';
import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';

let LAST_COMMAND: WorkerCommands | null = null;
let LAST_SETTINGS: IProducerSettings | null = null;
let LAST_RUN_ID: number | null = null;

let TIMER: number | null = null;

addEventListener('message', (event: MessageEvent<IWorkerRequest>) => {
  LAST_COMMAND = event.data.command;
  LAST_SETTINGS = event.data.settings;
});
