import { describe, expect, it } from 'vitest';
import { loadPortable, loadWasm } from './generator-api';
import { generatorContract } from './generator-contract';

generatorContract('compiled Wasm', loadWasm);

describe('compiled Wasm vs portable build', () => {
  it.each([
    [1, 1],
    [5, 42],
    [50, 0],
    [17, 0xdeadbeef],
  ])('match exactly for %i instruments, seed %i', async (count, seed) => {
    const wasm = await loadWasm();
    const portable = await loadPortable();
    wasm.init(count, seed);
    portable.init(count, seed);
    for (let i = 0; i < 5; i++) {
      expect(wasm.generateBatch(1000)).toEqual(portable.generateBatch(1000));
    }
  });
});
