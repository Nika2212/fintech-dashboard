import { AbstractControl, ValidationErrors } from '@angular/forms';

export function integerValidator(control: AbstractControl<number | null>): ValidationErrors | null {
  const value: number | null = control.value;

  return value === null || Number.isInteger(value) ? null : { integer: true };
}
