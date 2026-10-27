import {
  FIELDS_PER_UPDATE,
  MAX_BATCH_SIZE,
  MAX_INSTRUMENTS,
  MIN_BATCH_SIZE,
  MIN_INSTRUMENTS,
} from './constants';
import { instrumentCount, resetMarket, writeUpdate } from './market';
import { seedRandom } from './random';

/**
 * Starts a new run: seeds the random generator and creates `count` instruments
 * with fresh prices. Calling it again discards all previous state.
 * Throws when `count` is outside [1, 50].
 */
export function init(count: i32, seed: u32): void {
  if (count < MIN_INSTRUMENTS || count > MAX_INSTRUMENTS) {
    throw new Error('InstrumentCount must be an integer between 1 and 50');
  }
  seedRandom(seed);
  resetMarket(count);
}

/**
 * Generates exactly `size` market updates. Returns `size * 7` integers, one
 * 7-field record per update (layout in wasm/README.md).
 * Throws when called before init() or when `size` is outside [1, 1000].
 */
export function generateBatch(size: i32): Int32Array {
  if (instrumentCount() == 0) {
    throw new Error('init() must be called before generateBatch()');
  }
  if (size < MIN_BATCH_SIZE || size > MAX_BATCH_SIZE) {
    throw new Error('batch size must be an integer between 1 and 1000');
  }

  const out = new Int32Array(size * FIELDS_PER_UPDATE);
  for (let i = 0; i < size; i++) {
    writeUpdate(out, i * FIELDS_PER_UPDATE);
  }
  return out;
}

export function fieldsPerUpdate(): i32 {
  return FIELDS_PER_UPDATE;
}

export function maxInstruments(): i32 {
  return MAX_INSTRUMENTS;
}

export function maxBatchSize(): i32 {
  return MAX_BATCH_SIZE;
}
