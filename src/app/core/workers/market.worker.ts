/// <reference lib="webworker" />

import { IApplyRequest, IWorkerRequest } from '../../shared/interfaces/worker-request.interface';
import { WorkerCommands } from '../enums/worker-commands.enum';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';
import { validateCommand, validateSettings } from '../utils/producer-settings-validator.util';
import { IValidation } from '../../shared/interfaces/validation.interface';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';
import { WorkerResponses } from '../enums/worker-responses.enum';
import { FIELDS_PER_UPDATE, PRE_RUN_ID } from '../constants/defaults.constant';
import { instantiate } from '../../../../wasm/build/market-generator.js';
import { IMarketUpdate } from '../../shared/interfaces/market-update.interface';
import { IInstrumentTotals } from '../../shared/interfaces/instrument-totals.interface';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';

type MarketGenerator = Awaited<ReturnType<typeof instantiate>>;

interface IActiveRun {
  generator: MarketGenerator;
  settings: IProducerSettings;
}

let lastAppliedSettings: IProducerSettings | null = null;
let lastRunId: number = PRE_RUN_ID;
let timerId: number | null = null;
let activeRun: IActiveRun | null = null;
let isPaused: boolean = false;
let totals: IInstrumentTotals[] = createTotals();

const generatorReady: Promise<MarketGenerator> = loadGenerator();

async function loadGenerator(): Promise<MarketGenerator> {
  const url = new URL('wasm/market-generator.wasm', self.location.href);
  const module = await WebAssembly.compileStreaming(fetch(url));

  return instantiate(module, { env: {} });
}

addEventListener('message', (event: MessageEvent<IWorkerRequest>) => {
  const request: IWorkerRequest = event.data;
  const commandValidation: IValidation = validateCommand(request.command);

  if (!commandValidation.isValid) {
    return handleError(commandValidation.message);
  }

  switch (request.command) {
    case WorkerCommands.APPLY:
      onApply(request);
      break;
    case WorkerCommands.PAUSE:
      onPause();
      break;
    case WorkerCommands.RESUME:
      onResume();
      break;
  }
});

function emitEvent(event: IWorkerResponse): void {
  postMessage(event);
}

function onApply(request: IApplyRequest): void {
  lastRunId = request.runId;
  activeRun = null;
  isPaused = false;
  stopTimer();

  const settings: IProducerSettings | null = request.settings ?? lastAppliedSettings;

  if (!settings) {
    return handleError('No settings were provided');
  }

  const settingsValidation: IValidation = validateSettings(settings);

  if (!settingsValidation.isValid) {
    return handleError(settingsValidation.message);
  }

  lastAppliedSettings = settings;
  totals = createTotals(settings.instrumentCount);

  void startRun(request.runId, settings);
}

async function startRun(runId: number, settings: IProducerSettings): Promise<void> {
  try {
    const loaded = await generatorReady;

    if (runId !== lastRunId) return;

    loaded.init(settings.instrumentCount, crypto.getRandomValues(new Uint32Array(1))[0]);
    activeRun = { generator: loaded, settings };

    if (!isPaused) {
      run(activeRun);
    }
  } catch (error) {
    if (runId !== lastRunId) return;

    handleError(error instanceof Error ? error.message : 'Failed to load the market generator');
  }
}

function onPause(): void {
  isPaused = true;
  stopTimer();
}

function stopTimer(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function onResume(): void {
  isPaused = false;

  if (timerId !== null || !activeRun) {
    return;
  }

  run(activeRun);
}

function run(current: IActiveRun): void {
  timerId = setInterval(() => tick(current), current.settings.batchIntervalMs);
  tick(current);
}

function tick({ generator, settings }: IActiveRun): void {
  try {
    const batch: Int32Array = generator.generateBatch(settings.updatesPerBatch);
    const updates: IMarketUpdate[] = toMarketUpdates(batch);

    applyUpdates(totals, updates);

    emitEvent({ runId: lastRunId, state: WorkerResponses.UPDATE, instruments: toMetrics(totals) });
  } catch (error) {
    handleError(error instanceof Error ? error.message : 'Failed to execute tick');
  }
}

function createTotals(instrumentCount: number = 0): IInstrumentTotals[] {
  return Array.from({ length: instrumentCount }, () => ({
    hasData: false,
    lastTradePriceCents: 0,
    bidPriceCents: 0,
    askPriceCents: 0,
    bidQuantity: 0,
    askQuantity: 0,
    volume: 0,
    notionalCents: 0,
  }));
}

function toMarketUpdates(batch: Int32Array): IMarketUpdate[] {
  const updates: IMarketUpdate[] = [];
  for (let i = 0; i < batch.length; i += FIELDS_PER_UPDATE) {
    updates.push({
      instrumentId: batch[i],
      tradePriceCents: batch[i + 1],
      tradeQuantity: batch[i + 2],
      bidPriceCents: batch[i + 3],
      askPriceCents: batch[i + 4],
      bidQuantity: batch[i + 5],
      askQuantity: batch[i + 6],
    });
  }
  return updates;
}

function applyUpdates(totals: IInstrumentTotals[], updates: IMarketUpdate[]): void {
  for (const update of updates) {
    const t: IInstrumentTotals = totals[update.instrumentId];

    t.hasData = true;
    t.lastTradePriceCents = update.tradePriceCents;
    t.bidPriceCents = update.bidPriceCents;
    t.askPriceCents = update.askPriceCents;
    t.bidQuantity = update.bidQuantity;
    t.askQuantity = update.askQuantity;
    t.volume += update.tradeQuantity;
    t.notionalCents += update.tradePriceCents * update.tradeQuantity;
  }
}

function toMetrics(totals: IInstrumentTotals[]): IInstrumentMetrics[] {
  return totals.map((t, instrumentId) => {
    const bookQuantity = t.bidQuantity + t.askQuantity;

    return {
      instrumentId: instrumentId,
      lastTradePriceCents: t.hasData ? t.lastTradePriceCents : null,
      spreadCents: t.hasData ? t.askPriceCents - t.bidPriceCents : null,
      volume: t.volume,
      vwapCents: t.volume > 0 ? t.notionalCents / t.volume : null,
      imbalance: bookQuantity > 0 ? (t.bidQuantity - t.askQuantity) / bookQuantity : null,
    };
  });
}

function handleError(message: string): void {
  stopTimer();

  emitEvent({ runId: lastRunId, state: WorkerResponses.FAILED, message: message });
}
