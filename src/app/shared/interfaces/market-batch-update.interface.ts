import { IMarketSample } from './market-sample.interface';

export interface IMarketBatchUpdate {
  runId: number;
  samples: IMarketSample[];
}
