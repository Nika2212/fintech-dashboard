import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { MarketService } from './market.service';
import { MarketWorkerService } from './market-worker.service';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { WorkerResponses } from '../enums/worker-responses.enum';
import { WorkerStatuses } from '../enums/worker-statuses.enum';
import { DEFAULT_SETTINGS } from '../constants/defaults.constant';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';
import { IWorkerRequest } from '../../shared/interfaces/worker-request.interface';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';

const SETTINGS: IProducerSettings = { instrumentCount: 2, updatesPerBatch: 10, batchIntervalMs: 100 };

function metrics(volume: number): IInstrumentMetrics[] {
  return [{ instrumentId: 0, lastTradePriceCents: 100, spreadCents: 1, volume, vwapCents: 100, imbalance: 0 }];
}

function current<T>(stream: Observable<T>): T {
  let value!: T;
  stream.subscribe((next) => (value = next)).unsubscribe();
  return value;
}

describe('MarketService', () => {
  let service: MarketService;
  let messages: Subject<IWorkerResponse>;
  let dispatch: Mock<(request: IWorkerRequest) => void>;

  beforeEach(() => {
    messages = new Subject<IWorkerResponse>();
    dispatch = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: MarketWorkerService, useValue: { dispatch, onMessage: () => messages.asObservable() } },
      ],
    });
    service = TestBed.inject(MarketService);
  });

  function lastRequest(): IWorkerRequest {
    return dispatch.mock.lastCall![0];
  }

  function respond(response: IWorkerResponse): void {
    messages.next(response);
  }

  describe('start', () => {
    it('applies a copy of the default settings as run 1', () => {
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(lastRequest()).toEqual({ command: WorkerCommands.APPLY, runId: 1, settings: DEFAULT_SETTINGS });
      expect(current(service.getProducerSettings())).not.toBe(DEFAULT_SETTINGS);
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.RUNNING);
    });
  });

  describe('apply', () => {
    it('sends the new settings with the next run id', () => {
      service.apply(SETTINGS);

      expect(lastRequest()).toEqual({ command: WorkerCommands.APPLY, runId: 2, settings: SETTINGS });
      expect(current(service.getProducerSettings())).toEqual(SETTINGS);
    });

    it('stores a copy, so later changes to the caller object do not leak in', () => {
      const settings: IProducerSettings = { ...SETTINGS };
      service.apply(settings);
      settings.instrumentCount = 50;

      expect(current(service.getProducerSettings()).instrumentCount).toBe(SETTINGS.instrumentCount);
    });

    it('re-applies the current settings when called without arguments', () => {
      service.apply(SETTINGS);
      service.apply();

      expect(lastRequest()).toEqual({ command: WorkerCommands.APPLY, runId: 3, settings: SETTINGS });
    });

    it('resets metrics and error and marks the run as running', () => {
      respond({ runId: 1, state: WorkerResponses.UPDATE, instruments: metrics(10) });
      respond({ runId: 1, state: WorkerResponses.FAILED, message: 'boom' });

      service.apply(SETTINGS);

      expect(current(service.getInstrumentMetrics())).toEqual([]);
      expect(current(service.getErrorMessage())).toBeNull();
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.RUNNING);
    });
  });

  describe('worker responses', () => {
    it('publishes metrics from the current run', () => {
      respond({ runId: 1, state: WorkerResponses.UPDATE, instruments: metrics(10) });

      expect(current(service.getInstrumentMetrics())).toEqual(metrics(10));
    });

    it('publishes an empty list when an update has no instruments', () => {
      respond({ runId: 1, state: WorkerResponses.UPDATE, instruments: metrics(10) });
      respond({ runId: 1, state: WorkerResponses.UPDATE });

      expect(current(service.getInstrumentMetrics())).toEqual([]);
    });

    it('rejects updates from a previous run', () => {
      service.apply(SETTINGS);
      respond({ runId: 1, state: WorkerResponses.UPDATE, instruments: metrics(10) });

      expect(current(service.getInstrumentMetrics())).toEqual([]);
    });

    it('rejects failures from a previous run', () => {
      service.apply(SETTINGS);
      respond({ runId: 1, state: WorkerResponses.FAILED, message: 'old run failed' });

      expect(current(service.getErrorMessage())).toBeNull();
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.RUNNING);
    });

    it('reports a failure of the current run', () => {
      respond({ runId: 1, state: WorkerResponses.FAILED, message: 'Wasm is not available' });

      expect(current(service.getErrorMessage())).toBe('Wasm is not available');
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.FAILED);
    });

    it('uses a generic message when a failure has none', () => {
      respond({ runId: 1, state: WorkerResponses.FAILED });

      expect(current(service.getErrorMessage())).toBe('Worker failed.');
    });
  });

  describe('pause and resume', () => {
    it('pauses a running run', () => {
      service.pause();

      expect(lastRequest()).toEqual({ command: WorkerCommands.PAUSE });
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.PAUSED);
    });

    it('keeps the paused status when a batch sent before the pause arrives', () => {
      service.pause();
      respond({ runId: 1, state: WorkerResponses.UPDATE, instruments: metrics(10) });

      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.PAUSED);
      expect(current(service.getInstrumentMetrics())).toEqual(metrics(10));
    });

    it('resumes a paused run and keeps the totals shown so far', () => {
      respond({ runId: 1, state: WorkerResponses.UPDATE, instruments: metrics(10) });
      service.pause();
      service.resume();

      expect(lastRequest()).toEqual({ command: WorkerCommands.RESUME });
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.RUNNING);
      expect(current(service.getInstrumentMetrics())).toEqual(metrics(10));
    });

    it('ignores resume while running', () => {
      service.resume();

      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('ignores pause when the run has failed', () => {
      respond({ runId: 1, state: WorkerResponses.FAILED, message: 'boom' });
      service.pause();

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(current(service.getWorkerStatus())).toBe(WorkerStatuses.FAILED);
    });
  });
});
