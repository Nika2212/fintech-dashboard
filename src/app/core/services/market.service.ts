import { DestroyRef, inject, Injectable } from '@angular/core';
import { MarketWorkerService } from './market-worker.service';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';
import { BehaviorSubject, filter, Observable, Subject, takeUntil } from 'rxjs';
import {
  DEFAULT_SETTINGS,
  DEFAULT_INSTRUMENT_COUNT,
  DEFAULT_BATCH_INTERVAL_MS,
  DEFAULT_UPDATES_PER_BATCH, PRE_RUN_ID
} from '../constants/defaults.constant';
import { IWorkerRequest } from '../../shared/interfaces/worker-request.interface';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';
import { WorkerResponses } from '../enums/worker-responses.enum';
import { IMarketUpdate } from '../../shared/interfaces/market-update.interface';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkerStatuses } from '../enums/worker-statuses.enum';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly marketWorkerService: MarketWorkerService = inject(MarketWorkerService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private readonly instrumentMetrics$: BehaviorSubject<IInstrumentMetrics[]> = new BehaviorSubject<IInstrumentMetrics[]>([]);
  private readonly workerStatus$: BehaviorSubject<WorkerStatuses> = new BehaviorSubject<WorkerStatuses>(WorkerStatuses.IDLE);
  private runId: number = PRE_RUN_ID;
  private producerSettings: IProducerSettings = DEFAULT_SETTINGS;

  constructor() {
    this.setEvents();
    this.apply();
  }

  private setEvents(): void {
    this.marketWorkerService.onMessage()
      .pipe(
        filter((response: IWorkerResponse) => response?.runId === this.runId),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response: IWorkerResponse) => {
        if (!response || response.state === WorkerResponses.FAILED) {
          this.workerStatus$.next(WorkerStatuses.FAILED);
          this.onFailed(response?.message || 'Worker failed.');
        } else if (response.state === WorkerResponses.UPDATE && Array.isArray(response.instruments)) {
          this.workerStatus$.next(WorkerStatuses.RUNNING);
          this.onUpdate(response.instruments);
        }
      });
  }

  private onFailed(message: string): void {
    console.error(message);
  }

  private onUpdate(instruments: IInstrumentMetrics[]): void {
    this.instrumentMetrics$.next(instruments);
  }

  public apply(): void {
    this.runId++;
    this.workerStatus$.next(WorkerStatuses.RUNNING);
    this.instrumentMetrics$.next([]);
    this.marketWorkerService.dispatch({
      runId: this.runId,
      command: WorkerCommands.APPLY,
      settings: this.producerSettings,
    });
  }

  public pause(): void {}

  public resume(): void {}

  public setProducerSettings(settings: IProducerSettings): void {}
}
