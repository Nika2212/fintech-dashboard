import { describe, expect, it } from 'vitest';
import { VALIDATION_MESSAGES } from './validation-messages.constant';

describe('VALIDATION_MESSAGES', () => {
  it('names the limit that was crossed', () => {
    expect(VALIDATION_MESSAGES.min({ min: 50 })).toBe('Must be at least 50');
    expect(VALIDATION_MESSAGES.max({ max: 2000 })).toBe('Must be at most 2000');
  });
});
