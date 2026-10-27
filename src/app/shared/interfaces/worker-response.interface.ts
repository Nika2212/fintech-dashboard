import { WorkerResponses } from '../../core/enums/worker-responses.enum';
import { IInstrumentMetrics } from './instrument-metrics.interface';

export interface IWorkerResponse {
  runId: number;
  state: WorkerResponses;
  instruments?: IInstrumentMetrics[];
  message?: string;
}
