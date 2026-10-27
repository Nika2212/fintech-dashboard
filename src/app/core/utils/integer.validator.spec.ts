import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { integerValidator } from './integer.validator';

describe('integerValidator', () => {
  it('accepts whole numbers', () => {
    expect(integerValidator(new FormControl<number | null>(5))).toBeNull();
  });

  it('leaves empty values to the required validator', () => {
    expect(integerValidator(new FormControl<number | null>(null))).toBeNull();
  });

  it('rejects fractional numbers', () => {
    expect(integerValidator(new FormControl<number | null>(2.5))).toEqual({ integer: true });
  });
});
