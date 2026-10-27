import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketWorkerService } from './market-worker.service';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { WorkerResponses } from '../enums/worker-responses.enum';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';

class FakeWorker {
  public static instances: FakeWorker[] = [];

  public readonly postMessage = vi.fn();
  public readonly terminate = vi.fn();
  public listener: ((event: MessageEvent<IWorkerResponse>) => void) | null = null;

  public constructor(public readonly url: URL, public readonly options: WorkerOptions) {
    FakeWorker.instances.push(this);
  }

  public addEventListener(type: string, listener: (event: MessageEvent<IWorkerResponse>) => void): void {
    if (type === 'message') {
      this.listener = listener;
    }
  }
}

describe('MarketWorkerService', () => {
  let service: MarketWorkerService;

  beforeEach(() => {
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    service = TestBed.inject(MarketWorkerService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function worker(): FakeWorker {
    return FakeWorker.instances[0];
  }

  it('starts exactly one module worker', () => {
    expect(FakeWorker.instances).toHaveLength(1);
    expect(worker().options).toEqual({ type: 'module' });
    expect(worker().url).toBeInstanceOf(URL);
  });

  it('sends requests to the worker', () => {
    service.dispatch({ command: WorkerCommands.PAUSE });

    expect(worker().postMessage).toHaveBeenCalledWith({ command: WorkerCommands.PAUSE });
  });

  it('forwards worker responses', () => {
    const received: IWorkerResponse[] = [];
    service.onMessage().subscribe((response) => received.push(response));
    const response: IWorkerResponse = { runId: 1, state: WorkerResponses.UPDATE, instruments: [] };

    worker().listener?.({ data: response } as MessageEvent<IWorkerResponse>);

    expect(received).toEqual([response]);
  });

  it('terminates the worker and completes the stream when destroyed', () => {
    let completed = false;
    service.onMessage().subscribe({ complete: () => (completed = true) });

    TestBed.resetTestingModule();

    expect(worker().terminate).toHaveBeenCalledTimes(1);
    expect(completed).toBe(true);
  });

  it('ignores requests after it was destroyed', () => {
    TestBed.resetTestingModule();
    service.dispatch({ command: WorkerCommands.RESUME });

    expect(worker().postMessage).not.toHaveBeenCalled();
  });
});
