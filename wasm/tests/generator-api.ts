import { readFile } from 'node:fs/promises';
import { vi } from 'vitest';

/** Public API shared by the compiled Wasm module and the portable TypeScript build. */
export interface GeneratorApi {
  init(count: number, seed: number): void;
  generateBatch(size: number): Int32Array;
  fieldsPerUpdate(): number;
  maxInstruments(): number;
  maxBatchSize(): number;
}

export interface MarketUpdate {
  instrumentId: number;
  tradePriceCents: number;
  tradeQuantity: number;
  bidPriceCents: number;
  askPriceCents: number;
  bidQuantity: number;
  askQuantity: number;
}

export const FIELDS = 7;

let compiled: WebAssembly.Module | null = null;

/** A fresh instance of the compiled module, so no state leaks between tests. */
export async function loadWasm(): Promise<GeneratorApi> {
  const { instantiate } = await import('../build/market-generator.js');
  compiled ??= await WebAssembly.compile(
    await readFile(new URL('../build/market-generator.wasm', import.meta.url)),
  );
  return instantiate(compiled, { env: {} });
}

/** A fresh copy of the assembly/ sources running as TypeScript. */
export async function loadPortable(): Promise<GeneratorApi> {
  vi.resetModules();
  return import('../assembly/index');
}

export function decode(batch: Int32Array): MarketUpdate[] {
  const updates: MarketUpdate[] = [];
  for (let o = 0; o < batch.length; o += FIELDS) {
    updates.push({
      instrumentId: batch[o],
      tradePriceCents: batch[o + 1],
      tradeQuantity: batch[o + 2],
      bidPriceCents: batch[o + 3],
      askPriceCents: batch[o + 4],
      bidQuantity: batch[o + 5],
      askQuantity: batch[o + 6],
    });
  }
  return updates;
}
