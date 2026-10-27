import { ChangeDetectionStrategy, Component, inject, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { take } from 'rxjs';
import {
  TuiButton,
  TuiError,
  TuiLabel,
  TuiNotification,
  TuiNumberFormat,
  TuiTextfield,
  TuiTitle,
  tuiValidationErrorsProvider,
} from '@taiga-ui/core';
import { TuiFormatNumberPipe, TuiInputNumber } from '@taiga-ui/kit';
import { TuiCardLarge, TuiForm, TuiHeader } from '@taiga-ui/layout';
import { MarketService } from '../../core/services/market.service';
import { integerValidator } from '../../core/utils/integer.validator';
import { nominalUpdatesPerSecond } from '../../core/utils/nominal-rate.util';
import { VALIDATION_MESSAGES } from '../../core/constants/validation-messages.constant';
import {
  MAX_BATCH_INTERVAL_MS,
  MAX_INSTRUMENT_COUNT,
  MAX_UPDATES_PER_BATCH,
  MIN_BATCH_INTERVAL_MS,
  MIN_INSTRUMENT_COUNT,
  MIN_UPDATES_PER_BATCH,
} from '../../core/constants/defaults.constant';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';

type SettingsForm = FormGroup<{
  instrumentCount: FormControl<number | null>;
  updatesPerBatch: FormControl<number | null>;
  batchIntervalMs: FormControl<number | null>;
}>;

function rangeValidators(min: number, max: number): ValidatorFn[] {
  return [Validators.required, Validators.min(min), Validators.max(max), integerValidator];
}

@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiCardLarge,
    TuiError,
    TuiForm,
    TuiFormatNumberPipe,
    TuiHeader,
    TuiInputNumber,
    TuiLabel,
    TuiNotification,
    TuiNumberFormat,
    TuiTextfield,
    TuiTitle,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [tuiValidationErrorsProvider(VALIDATION_MESSAGES)],
})
export class SettingsComponent {
  private readonly marketService: MarketService = inject(MarketService);

  protected readonly limits = {
    instrumentCount: { min: MIN_INSTRUMENT_COUNT, max: MAX_INSTRUMENT_COUNT },
    updatesPerBatch: { min: MIN_UPDATES_PER_BATCH, max: MAX_UPDATES_PER_BATCH },
    batchIntervalMs: { min: MIN_BATCH_INTERVAL_MS, max: MAX_BATCH_INTERVAL_MS },
  };

  protected readonly form: SettingsForm = new FormGroup({
    instrumentCount: new FormControl<number | null>(null, rangeValidators(MIN_INSTRUMENT_COUNT, MAX_INSTRUMENT_COUNT)),
    updatesPerBatch: new FormControl<number | null>(null, rangeValidators(MIN_UPDATES_PER_BATCH, MAX_UPDATES_PER_BATCH)),
    batchIntervalMs: new FormControl<number | null>(null, rangeValidators(MIN_BATCH_INTERVAL_MS, MAX_BATCH_INTERVAL_MS)),
  });

  protected readonly applied: WritableSignal<boolean> = signal(false);
  protected readonly nominalRate: WritableSignal<number | null> = signal(null);

  constructor() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.applied.set(false);
        this.nominalRate.set(this.calculateNominalRate());
      });

    this.marketService.getProducerSettings()
      .pipe(take(1), takeUntilDestroyed())
      .subscribe((settings: IProducerSettings) => this.form.setValue(settings));
  }

  protected apply(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.marketService.apply(this.form.getRawValue() as IProducerSettings);
    this.form.markAsPristine();
    this.applied.set(true);
  }

  private calculateNominalRate(): number | null {
    const { updatesPerBatch, batchIntervalMs } = this.form.controls;

    if (updatesPerBatch.invalid || batchIntervalMs.invalid) {
      return null;
    }

    return nominalUpdatesPerSecond(updatesPerBatch.value as number, batchIntervalMs.value as number);
  }
}
