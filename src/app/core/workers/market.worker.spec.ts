import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { WorkerResponses } from '../enums/worker-responses.enum';
import { IWorkerRequest } from '../../shared/interfaces/worker-request.interface';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';

const SETTINGS: IProducerSettings = { instrumentCount: 2, updatesPerBatch: 2, batchIntervalMs: 100 };

const EXAMPLE_BATCH = [0, 10000, 10, 10000, 10001, 0, 0, 0, 10200, 30, 10196, 10200, 600, 400];

interface IFakeGenerator {
  init: Mock;
  generateBatch: Mock<(size: number) => Int32Array>;
}

const BATCH_HEADER_POINTER = 16;
const BATCH_DATA_POINTER = 64;

function fakeWasmExports(generator: IFakeGenerator): object {
  const memory = { buffer: new ArrayBuffer(64 * 1024) };
  const view = new DataView(memory.buffer);

  return {
    memory,
    init: generator.init,
    generateBatch(size: number): number {
      const batch = generator.generateBatch(size);
      new Int32Array(memory.buffer, BATCH_DATA_POINTER, batch.length).set(batch);
      view.setUint32(BATCH_HEADER_POINTER + 4, BATCH_DATA_POINTER, true);
      view.setUint32(BATCH_HEADER_POINTER + 8, batch.byteLength, true);
      return BATCH_HEADER_POINTER;
    },
  };
}

describe('market.worker', () => {
  let listener: (event: MessageEvent<IWorkerRequest>) => void;
  let postMessage: Mock;
  let compileStreaming: Mock;
  let instantiate: Mock;
  let generator: IFakeGenerator;
  let runId: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    runId = 0;

    generator = {
      init: vi.fn(),
      generateBatch: vi.fn(() => new Int32Array(EXAMPLE_BATCH)),
    };

    postMessage = vi.fn();
    compileStreaming = vi.fn().mockResolvedValue({});
    instantiate = vi.fn(async () => ({ exports: fakeWasmExports(generator) }));
    vi.stubGlobal('postMessage', postMessage);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({}));
    vi.stubGlobal('WebAssembly', { compileStreaming, instantiate });
    vi.stubGlobal('addEventListener', (type: string, handler: typeof listener) => {
      if (type === 'message') {
        listener = handler;
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function startWorker(): Promise<void> {
    await import('./market.worker');
  }

  async function send(request: IWorkerRequest): Promise<void> {
    listener({ data: request } as MessageEvent<IWorkerRequest>);
    await vi.advanceTimersByTimeAsync(0);
  }

  function responses(): IWorkerResponse[] {
    return postMessage.mock.calls.map(([response]) => response as IWorkerResponse);
  }

  function lastResponse(): IWorkerResponse {
    return responses()[responses().length - 1];
  }

  function apply(settings: IProducerSettings | null = SETTINGS): Promise<void> {
    runId++;
    return send({ command: WorkerCommands.APPLY, runId, settings: settings ?? undefined });
  }

  function applyNow(): void {
    runId++;
    listener({ data: { command: WorkerCommands.APPLY, runId, settings: SETTINGS } } as MessageEvent<IWorkerRequest>);
  }

  describe('loading', () => {
    it('compiles the Wasm file served next to the app and instantiates the bindings', async () => {
      await startWorker();
      await vi.advanceTimersByTimeAsync(0);

      const fetchMock = vi.mocked(fetch);
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/wasm\/market-generator\.wasm$/);
      expect(compileStreaming).toHaveBeenCalledTimes(1);
      expect(instantiate).toHaveBeenCalledWith({}, expect.objectContaining({ env: expect.anything() }));
    });

    it('reports a failed Wasm load on apply', async () => {
      compileStreaming.mockRejectedValue(new Error('Wasm is not available'));
      await startWorker();
      await apply();

      expect(lastResponse()).toEqual({
        runId: 1,
        state: WorkerResponses.FAILED,
        message: 'Could not load the market generator: Wasm is not available',
      });
    });

    it('reports a generic message when the load fails with a non-Error value', async () => {
      compileStreaming.mockRejectedValue('offline');
      await startWorker();
      await apply();

      expect(lastResponse().message).toBe('Could not load the market generator');
    });

    it('starts only the latest run when several applies arrive while Wasm is loading', async () => {
      let finishLoading: (module: object) => void = () => undefined;
      compileStreaming.mockReturnValue(new Promise((resolve) => (finishLoading = resolve)));
      await startWorker();

      applyNow();
      applyNow();
      finishLoading({});
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 3);

      expect(generator.init).toHaveBeenCalledTimes(1);
      expect(responses()).toHaveLength(4);
      expect(responses().every((response) => response.runId === 2)).toBe(true);
    });

    it('reports a failed load once, for the latest run only', async () => {
      let failLoading: (reason: Error) => void = () => undefined;
      compileStreaming.mockReturnValue(new Promise((_, reject) => (failLoading = reject)));
      await startWorker();

      applyNow();
      applyNow();
      failLoading(new Error('Wasm is not available'));
      await vi.advanceTimersByTimeAsync(0);

      expect(responses()).toEqual([
        { runId: 2, state: WorkerResponses.FAILED, message: 'Could not load the market generator: Wasm is not available' },
      ]);
    });
  });

  describe('request validation', () => {
    beforeEach(startWorker);

    it('rejects an unknown command under the pre-run id', async () => {
      await send({ command: 'restart' } as unknown as IWorkerRequest);

      expect(responses()).toEqual([
        { runId: 0, state: WorkerResponses.FAILED, message: 'Invalid command type' },
      ]);
    });

    it('rejects the first apply when no settings were ever provided', async () => {
      await apply(null);

      expect(lastResponse()).toEqual({
        runId: 1,
        state: WorkerResponses.FAILED,
        message: 'No settings were provided',
      });
      expect(generator.init).not.toHaveBeenCalled();
    });

    it('rejects invalid settings under the new run id and does not start a run', async () => {
      await apply({ ...SETTINGS, instrumentCount: 51 });

      expect(lastResponse()).toEqual({
        runId: 1,
        state: WorkerResponses.FAILED,
        message: 'Instrument count should be integer and in range 1 - 50',
      });
      expect(generator.init).not.toHaveBeenCalled();
    });

    it('stops the current run when a new apply has invalid settings', async () => {
      await apply();
      await apply({ ...SETTINGS, updatesPerBatch: 0 });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 3);

      expect(responses()).toHaveLength(2);
      expect(lastResponse()).toMatchObject({ runId: 2, state: WorkerResponses.FAILED });

      await send({ command: WorkerCommands.RESUME });
      expect(responses()).toHaveLength(2);
    });

    it('ignores settings sent with commands other than apply', async () => {
      await apply();
      await send({
        command: WorkerCommands.PAUSE,
        settings: { ...SETTINGS, updatesPerBatch: 7 },
      } as IWorkerRequest);
      await send({ command: WorkerCommands.RESUME });

      expect(generator.generateBatch).toHaveBeenLastCalledWith(SETTINGS.updatesPerBatch);
    });
  });

  describe('apply', () => {
    beforeEach(startWorker);

    it('initialises the generator with the instrument count and a random seed', async () => {
      await apply();

      expect(generator.init).toHaveBeenCalledTimes(1);
      const [count, seed] = generator.init.mock.calls[0];
      expect(count).toBe(SETTINGS.instrumentCount);
      expect(Number.isInteger(seed)).toBe(true);
    });

    it('emits the first batch immediately and then one batch per interval', async () => {
      await apply();
      expect(responses()).toHaveLength(1);

      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 3);
      expect(responses()).toHaveLength(4);
      expect(generator.generateBatch).toHaveBeenCalledWith(SETTINGS.updatesPerBatch);
    });

    it('tags every update with the run id it was sent', async () => {
      await send({ command: WorkerCommands.APPLY, runId: 7, settings: SETTINGS });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);

      expect(responses()).toHaveLength(2);
      expect(responses().every((response) => response.runId === 7)).toBe(true);
      expect(lastResponse().state).toBe(WorkerResponses.UPDATE);
    });

    it('starts a new run with fresh totals and stops the previous timer', async () => {
      await apply();
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);
      postMessage.mockClear();

      await apply();
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);

      expect(generator.init).toHaveBeenCalledTimes(2);
      expect(responses()).toHaveLength(2);
      expect(responses().every((response) => response.runId === 2)).toBe(true);
      expect(responses()[0].instruments?.[0].volume).toBe(40);
    });

    it('reuses the last applied settings when apply is sent without settings', async () => {
      await apply();
      await apply(null);

      expect(generator.init).toHaveBeenLastCalledWith(SETTINGS.instrumentCount, expect.any(Number));
      expect(lastResponse().runId).toBe(2);
    });
  });

  describe('pause and resume', () => {
    beforeEach(startWorker);

    it('stops generating while paused', async () => {
      await apply();
      await send({ command: WorkerCommands.PAUSE });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 5);

      expect(responses()).toHaveLength(1);
    });

    it('resumes without re-initialising and keeps the totals', async () => {
      await apply();
      await send({ command: WorkerCommands.PAUSE });
      await send({ command: WorkerCommands.RESUME });

      expect(generator.init).toHaveBeenCalledTimes(1);
      expect(lastResponse().runId).toBe(1);
      expect(lastResponse().instruments?.[0].volume).toBe(80);
    });

    it('does not start a second timer when resume arrives while running', async () => {
      await apply();
      await send({ command: WorkerCommands.RESUME });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);

      expect(responses()).toHaveLength(2);
    });

    it('stays paused when pause arrives while Wasm is loading', async () => {
      let finishLoading: (module: object) => void = () => undefined;
      compileStreaming.mockReturnValue(new Promise((resolve) => (finishLoading = resolve)));
      vi.resetModules();
      await startWorker();

      applyNow();
      await send({ command: WorkerCommands.PAUSE });
      finishLoading({});
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 3);

      expect(generator.init).toHaveBeenCalledTimes(1);
      expect(responses()).toEqual([]);

      await send({ command: WorkerCommands.RESUME });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);

      expect(responses()).toHaveLength(2);
      expect(lastResponse().runId).toBe(1);
    });

    it('starts normally when resume follows a pause while Wasm is loading', async () => {
      let finishLoading: (module: object) => void = () => undefined;
      compileStreaming.mockReturnValue(new Promise((resolve) => (finishLoading = resolve)));
      vi.resetModules();
      await startWorker();

      applyNow();
      await send({ command: WorkerCommands.PAUSE });
      await send({ command: WorkerCommands.RESUME });
      finishLoading({});
      await vi.advanceTimersByTimeAsync(0);

      expect(responses()).toHaveLength(1);
    });

    it('does nothing on resume before any run was started', async () => {
      await send({ command: WorkerCommands.RESUME });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);

      expect(responses()).toEqual([]);
    });

    it('does nothing on pause when nothing is running', async () => {
      await send({ command: WorkerCommands.PAUSE });

      expect(responses()).toEqual([]);
    });
  });

  describe('generation errors', () => {
    beforeEach(startWorker);

    it('reports a failing first batch and does not keep the timer running', async () => {
      generator.generateBatch.mockImplementation(() => {
        throw new Error('batch size must be an integer between 1 and 1000');
      });
      await apply();
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 3);

      expect(responses()).toEqual([
        {
          runId: 1,
          state: WorkerResponses.FAILED,
          message: 'batch size must be an integer between 1 and 1000',
        },
      ]);
    });

    it('stops the timer when a later batch fails with a non-Error value', async () => {
      await apply();
      generator.generateBatch.mockImplementation(() => {
        throw 'out of memory';
      });
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs * 3);

      expect(responses()).toHaveLength(2);
      expect(lastResponse()).toEqual({
        runId: 1,
        state: WorkerResponses.FAILED,
        message: 'Failed to execute tick',
      });
    });
  });

  describe('metrics', () => {
    beforeEach(startWorker);

    it('calculates the worked example from the task', async () => {
      await apply();

      expect(lastResponse().instruments?.[0]).toEqual({
        instrumentId: 0,
        symbol: 'ALFA',
        lastTradePriceCents: 10200,
        spreadCents: 4,
        volume: 40,
        vwapCents: 10150,
        imbalance: 0.2,
      });
    });

    it('shows unavailable values and zero volume for an instrument without updates', async () => {
      await apply();

      expect(lastResponse().instruments?.[1]).toEqual({
        instrumentId: 1,
        symbol: 'BETA',
        lastTradePriceCents: null,
        spreadCents: null,
        volume: 0,
        vwapCents: null,
        imbalance: null,
      });
    });

    it('returns no imbalance when both book quantities are zero', async () => {
      generator.generateBatch.mockReturnValue(new Int32Array(EXAMPLE_BATCH.slice(0, 7)));
      await apply();

      expect(lastResponse().instruments?.[0]).toMatchObject({
        lastTradePriceCents: 10000,
        spreadCents: 1,
        vwapCents: 10000,
        imbalance: null,
      });
    });

    it('keeps instruments isolated from each other', async () => {
      generator.generateBatch.mockReturnValue(
        new Int32Array([0, 10000, 10, 9999, 10000, 5, 5, 1, 500, 3, 500, 502, 0, 100]),
      );
      await apply();

      const [first, second] = lastResponse().instruments ?? [];
      expect(first).toMatchObject({ lastTradePriceCents: 10000, volume: 10, imbalance: 0 });
      expect(second).toMatchObject({ lastTradePriceCents: 500, volume: 3, imbalance: -1 });
    });

    it('accumulates volume and VWAP across batches', async () => {
      await apply();
      await vi.advanceTimersByTimeAsync(SETTINGS.batchIntervalMs);

      expect(lastResponse().instruments?.[0]).toMatchObject({ volume: 80, vwapCents: 10150 });
    });
  });
});
