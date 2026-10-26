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
import {IMetricPackage} from '../../shared/interfaces/metric-package.interface';

@Injectable({providedIn: 'root'})
export class MarketService {
  private readonly marketWorkerService: MarketWorkerService = inject(MarketWorkerService);

  private settings: IProducerSettings = SETTINGS_DEFAULT;
  private metricPackage: IMetricPackage | null = null;

  constructor() {
    this.setEvents();
  }

  private setEvents(): void {
    this.marketWorkerService.onMessage()
      .subscribe((response: IWorkerResponse) => {
        if (response.state === WorkerStateTypes.UPDATE && Array.isArray(response.samples)) {
          this.aggregateAndUpdate(response.runId, response.samples);
        } else if (response.state === WorkerStateTypes.FAILED) {
          // Notify app that business error hapenned
        }
      });
  }

  private aggregateAndUpdate(runId: number, samples: IMarketSample[]): void {

  }

  public setSettings(settings: IProducerSettings): void {
    this.settings = settings;
  }

  public getSettings(): IProducerSettings {
    return this.settings;
  }

  public setDefaultSettings(): void {
    this.settings = SETTINGS_DEFAULT;
  }
}
