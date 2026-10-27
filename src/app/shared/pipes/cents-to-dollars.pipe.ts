import { Pipe, PipeTransform } from '@angular/core';

const CENTS_PER_DOLLAR: number = 100;

@Pipe({ name: 'centsToDollars' })
export class CentsToDollarsPipe implements PipeTransform {
  public transform(cents: number): number {
    return cents / CENTS_PER_DOLLAR;
  }
}
