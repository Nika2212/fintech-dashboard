/// <reference lib="webworker" />

import {IWorkerRequest} from '../../shared/interfaces/worker-request.interface';
import {WorkerCommands} from '../enums/worker-commands.enum';
import {IProducerSettings} from '../../shared/interfaces/producer-settings.interface';
import {validateCommand, validateSettings} from '../utils/producer-settings-validator.util';
import {IValidation} from '../../shared/interfaces/validation.interface';
import {IWorkerResponse} from '../../shared/interfaces/worker-response.interface';
import {WorkerStateTypes} from '../enums/worker-state-types.enum';
import {FIELDS_PER_UPDATE, PRE_RUN_ID} from '../constants/defaults.constant';
import {instantiate} from '../../../../wasm/build/market-generator.js';
import {IMarketUpdate} from '../../shared/interfaces/market-update.interface';
import {IInstrumentTotals} from '../../shared/interfaces/instrument-totals.interface';
import {IInstrumentMetrics} from '../../shared/interfaces/instrument-metrics.interface';

type MarketGenerator = Awaited<ReturnType<typeof instantiate>>;

let lastAppliedSettings: IProducerSettings;
let lastRunId: number = PRE_RUN_ID;
let timerId: number | null = null;
let generator: MarketGenerator | null = null;
let totals: IInstrumentTotals[] = createTotals(0);

const generatorReady: Promise<MarketGenerator> = loadGenerator();

async function loadGenerator(): Promise<MarketGenerator> {
  const url = new URL('wasm/market-generator.wasm', self.location.href);
  const module = await WebAssembly.compileStreaming(fetch(url));
  return instantiate(module, {env: {}});
}

addEventListener('message', (event: MessageEvent<IWorkerRequest>) => {
  const actionValidation: IValidation = validateCommand(event.data.command);

  // TODO : - Wrap into single entity checking
  if (!actionValidation.isValid) {
    return handleError(actionValidation.message);
  }

  if (!lastAppliedSettings && !event.data.settings) {
    return handleError('No settings were provided');
  }

  if (event.data.command === WorkerCommands.APPLY && event.data.settings) {
    const settingsValidation: IValidation = validateSettings(event.data.settings);

    if (!settingsValidation.isValid) {
      return handleError(settingsValidation.message);
    }

    lastAppliedSettings = event.data.settings;
  }

  switch (event.data.command) {
    case WorkerCommands.APPLY:
      void onApply();
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

async function onApply(): Promise<void> {
  lastRunId++;
  generator = null

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  const currentRunId: number = lastRunId;

  totals = createTotals(lastAppliedSettings.instrumentCount);

  try {
    const loaded = await generatorReady;

    if (currentRunId !== lastRunId) return;

    loaded.init(lastAppliedSettings.instrumentCount, crypto.getRandomValues(new Uint32Array(1))[0]);
    generator = loaded;

    run();
  } catch (error) {
    handleError(error instanceof Error ? error.message : 'Failed to load the market generator');
  }
}

function onPause(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function onResume(): void {
  if (timerId !== null || !generator) {
    return;
  }

  run();
}

function run(): void {
  tick(lastAppliedSettings);
  timerId = setInterval(() => tick(lastAppliedSettings), lastAppliedSettings.batchIntervalMs);
}

function tick(settings: IProducerSettings): void {
  if (!generator) {
    return;
  }

  try {
    const batch: Int32Array = generator.generateBatch(settings.updatesPerBatch);
    const updates: IMarketUpdate[] = toMarketUpdates(batch);

    applyUpdates(totals, updates);

    emitEvent({runId: lastRunId, state: WorkerStateTypes.UPDATE, instruments: toMetrics(totals)});
  } catch (error) {
    handleError(error instanceof Error ? error.message : 'Failed to execute tick');
  }
}

function createTotals(instrumentCount: number): IInstrumentTotals[] {
  return Array.from({length: instrumentCount}, () => ({
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
  const timestamp = Date.now();
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
      timestamp,
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
      instrumentId,
      lastTradePriceCents: t.hasData ? t.lastTradePriceCents : null,
      spreadCents: t.hasData ? t.askPriceCents - t.bidPriceCents : null,
      volume: t.volume,
      vwapCents: t.volume > 0 ? t.notionalCents / t.volume : null,
      imbalance: bookQuantity > 0 ? (t.bidQuantity - t.askQuantity) / bookQuantity : null,
    };
  });
}

function handleError(message: string): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  emitEvent({runId: lastRunId, state: WorkerStateTypes.FAILED, message: message});
}
