import { describe, expect, it } from 'vitest';
import { INSTRUMENT_SYMBOLS } from './instrument-symbols.constant';
import { MAX_INSTRUMENT_COUNT } from './defaults.constant';

describe('INSTRUMENT_SYMBOLS', () => {
  it('has a symbol for every possible instrument', () => {
    expect(INSTRUMENT_SYMBOLS).toHaveLength(MAX_INSTRUMENT_COUNT);
  });

  it('starts with the symbols from the task', () => {
    expect(INSTRUMENT_SYMBOLS.slice(0, 2)).toEqual(['ALFA', 'BETA']);
  });

  it('uses unique four-letter uppercase symbols', () => {
    expect(new Set(INSTRUMENT_SYMBOLS).size).toBe(INSTRUMENT_SYMBOLS.length);
    expect(INSTRUMENT_SYMBOLS.every((symbol) => /^[A-Z]{4}$/.test(symbol))).toBe(true);
  });
});
