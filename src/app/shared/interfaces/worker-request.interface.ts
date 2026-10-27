import { WorkerCommands } from '../../core/enums/worker-commands.enum';
import { IProducerSettings } from './producer-settings.interface';

export interface IApplyRequest {
  command: WorkerCommands.APPLY;
  runId: number;
  settings?: IProducerSettings;
}

export interface IControlRequest {
  command: WorkerCommands.PAUSE | WorkerCommands.RESUME;
}

export type IWorkerRequest = IApplyRequest | IControlRequest;
