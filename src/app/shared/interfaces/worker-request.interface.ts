import {WorkerCommands} from '../../core/enums/worker-commands.enum';
import {IProducerSettings} from './producer-settings.interface';

export interface IWorkerRequest {
  command: WorkerCommands;
  settings: IProducerSettings;
}
