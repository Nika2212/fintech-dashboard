import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { MarketWorkerService } from './market-worker.service';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { WorkerResponses } from '../enums/worker-responses.enum';
import { WorkerStatuses } from '../enums/worker-statuses.enum';
import { DEFAULT_SETTINGS, PRE_RUN_ID } from '../constants/defaults.constant';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly marketWorkerService: MarketWorkerService = inject(MarketWorkerService);

  private readonly instrumentMetrics$: BehaviorSubject<IInstrumentMetrics[]> = new BehaviorSubject<IInstrumentMetrics[]>([]);
  private readonly workerStatus$: BehaviorSubject<WorkerStatuses> = new BehaviorSubject<WorkerStatuses>(WorkerStatuses.IDLE);
  private readonly errorMessage$: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  private readonly producerSettings$: BehaviorSubject<IProducerSettings> = new BehaviorSubject<IProducerSettings>({ ...DEFAULT_SETTINGS });
  private runId: number = PRE_RUN_ID;

  constructor() {
    this.setEvents();
    this.apply();
  }

  public getInstrumentMetrics(): Observable<IInstrumentMetrics[]> {
    return this.instrumentMetrics$.asObservable();
  }

  public getWorkerStatus(): Observable<WorkerStatuses> {
    return this.workerStatus$.asObservable();
  }

  public getErrorMessage(): Observable<string | null> {
    return this.errorMessage$.asObservable();
  }

  public getProducerSettings(): Observable<IProducerSettings> {
    return this.producerSettings$.asObservable();
  }

  public apply(settings: IProducerSettings = this.producerSettings$.value): void {
    this.runId++;
    this.producerSettings$.next({ ...settings });
    this.instrumentMetrics$.next([]);
    this.errorMessage$.next(null);
    this.workerStatus$.next(WorkerStatuses.RUNNING);

    this.marketWorkerService.dispatch({
      command: WorkerCommands.APPLY,
      runId: this.runId,
      settings: this.producerSettings$.value,
    });
  }

  public pause(): void {
    if (this.workerStatus$.value !== WorkerStatuses.RUNNING) {
      return;
    }

    this.marketWorkerService.dispatch({ command: WorkerCommands.PAUSE });
    this.workerStatus$.next(WorkerStatuses.PAUSED);
  }

  public resume(): void {
    if (this.workerStatus$.value !== WorkerStatuses.PAUSED) {
      return;
    }

    this.marketWorkerService.dispatch({ command: WorkerCommands.RESUME });
    this.workerStatus$.next(WorkerStatuses.RUNNING);
  }

  private setEvents(): void {
    this.marketWorkerService.onMessage()
      .pipe(
        filter((response: IWorkerResponse) => response.runId === this.runId),
        takeUntilDestroyed(),
      )
      .subscribe((response: IWorkerResponse) => {
        switch (response.state) {
          case WorkerResponses.UPDATE:
            this.instrumentMetrics$.next(response.instruments ?? []);
            break;
          case WorkerResponses.FAILED:
            this.errorMessage$.next(response.message ?? 'Worker failed.');
            this.workerStatus$.next(WorkerStatuses.FAILED);
            break;
        }
      });
  }
}
