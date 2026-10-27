import { inject, Injectable } from '@angular/core';
import { MarketWorkerService } from './market-worker.service';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  DEFAULT_SETTINGS,
  DEFAULT_INSTRUMENT_COUNT,
  DEFAULT_BATCH_INTERVAL_MS,
  DEFAULT_UPDATES_PER_BATCH
} from '../constants/defaults.constant';
import { IWorkerRequest } from '../../shared/interfaces/worker-request.interface';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';
import { WorkerStateTypes } from '../enums/worker-state-types.enum';
import { IMarketUpdate } from '../../shared/interfaces/market-update.interface';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly marketWorkerService: MarketWorkerService = inject(MarketWorkerService);

  private settings: IProducerSettings = DEFAULT_SETTINGS;


  constructor() {
    // this.marketWorkerService.dispatch({
    //   command: WorkerCommands.APPLY,
    //   settings: this.settings
    // })
  }
}
