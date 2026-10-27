import { describe, expect, it } from 'vitest';
import { nominalUpdatesPerSecond } from './nominal-rate.util';

describe('nominalUpdatesPerSecond', () => {
  it('matches the task example: 100 updates every 500 ms is 200 per second', () => {
    expect(nominalUpdatesPerSecond(100, 500)).toBe(200);
  });

  it('rounds to a whole number of updates', () => {
    expect(nominalUpdatesPerSecond(100, 300)).toBe(333);
  });

  it('covers the fastest allowed setting', () => {
    expect(nominalUpdatesPerSecond(1000, 50)).toBe(20000);
  });
});
