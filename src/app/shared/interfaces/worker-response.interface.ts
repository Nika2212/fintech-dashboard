import { IMarketUpdate } from './market-update.interface';
import {WorkerStateTypes} from '../../core/enums/worker-state-types.enum';
import {IInstrumentMetrics} from './instrument-metrics.interface';

export interface IWorkerResponse {
  runId: number;
  state: WorkerStateTypes;
  instruments?: IInstrumentMetrics[];
  message?: string;
}
