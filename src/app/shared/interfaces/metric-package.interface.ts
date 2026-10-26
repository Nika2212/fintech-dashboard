import {IMetrics} from './metrics.interface';

export interface IMetricPackage {
  runId: number;
  metrics: IMetrics[];
}
