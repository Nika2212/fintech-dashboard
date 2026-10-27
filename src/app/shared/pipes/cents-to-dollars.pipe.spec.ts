import { describe, expect, it } from 'vitest';
import { CentsToDollarsPipe } from './cents-to-dollars.pipe';

describe('CentsToDollarsPipe', () => {
  const pipe = new CentsToDollarsPipe();

  it('converts integer cents to dollars', () => {
    expect(pipe.transform(10200)).toBe(102);
    expect(pipe.transform(4)).toBe(0.04);
  });

  it('keeps fractional cents for display rounding later', () => {
    expect(pipe.transform(10150.5)).toBe(101.505);
  });
});
