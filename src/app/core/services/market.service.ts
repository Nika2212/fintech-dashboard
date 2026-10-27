import {inject, Injectable} from '@angular/core';
import {MarketWorkerService} from './market-worker.service';
import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {BehaviorSubject, Observable} from 'rxjs';
import {
  SETTINGS_DEFAULT,
  SETTINGS_DEFAULT_INSTRUMENT_COUNT,
  SETTINGS_DEFAULT_UPDATE_INTERVAL,
  SETTINGS_DEFAULT_UPDATE_PACKAGE
} from '../constants/defaults.constant';
import {IWorkerRequest} from '../../shared/interfaces/worker-request.interface';
import {IWorkerResponse} from '../../shared/interfaces/worker-response.interface';
import {WorkerStateTypes} from '../enums/worker-state-types.enum';
import {IMarketSample} from '../../shared/interfaces/market-sample.interface';
import {IMetrics} from '../../shared/interfaces/metrics.interface';

@Injectable({providedIn: 'root'})
export class MarketService {
  private readonly marketWorkerService: MarketWorkerService = inject(MarketWorkerService);

  private settings: IProducerSettings = SETTINGS_DEFAULT;


  constructor() {
    // this.marketWorkerService.dispatch({
    //   command: WorkerCommands.APPLY,
    //   settings: this.settings
    // })
  }
}
