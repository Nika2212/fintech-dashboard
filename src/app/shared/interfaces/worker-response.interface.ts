import { IMarketSample } from './market-sample.interface';
import {WorkerStateTypes} from '../../core/enums/worker-state-types.enum';

export interface IWorkerResponse {
  runId: number;
  state: WorkerStateTypes;
  samples: IMarketSample[] | null;
}
