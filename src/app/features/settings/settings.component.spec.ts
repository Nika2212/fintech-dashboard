import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { provideTaiga } from '@taiga-ui/core';
import { NUMBER_FORMAT_PROVIDER } from '../../app.config';
import { SettingsComponent } from './settings.component';
import { MarketService } from '../../core/services/market.service';
import { IProducerSettings } from '../../shared/interfaces/producer-settings.interface';

const CURRENT: IProducerSettings = { instrumentCount: 7, updatesPerBatch: 250, batchIntervalMs: 400 };

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let apply: Mock<(settings: IProducerSettings) => void>;

  beforeEach(async () => {
    apply = vi.fn();

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        provideTaiga(),
        NUMBER_FORMAT_PROVIDER,
        { provide: MarketService, useValue: { apply, getProducerSettings: () => of(CURRENT) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    await fixture.whenStable();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function form(): FormGroup {
    return fixture.componentInstance['form'];
  }

  async function submit(): Promise<void> {
    (element().querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function setValue(name: keyof IProducerSettings, value: number | null): Promise<void> {
    form().controls[name].setValue(value);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function errors(): string[] {
    return Array.from(element().querySelectorAll('tui-error'), (error) => error.textContent?.trim() ?? '').filter(Boolean);
  }

  function notification(): string {
    return element().querySelector('[tuiNotification]')?.textContent?.trim() ?? '';
  }

  it('shows the page heading', () => {
    expect(element().querySelector('h2')?.textContent?.trim()).toBe('Settings');
  });

  it('starts with the settings of the current run', () => {
    expect(form().getRawValue()).toEqual(CURRENT);
  });

  it('labels every field with its allowed range', () => {
    const labels = Array.from(element().querySelectorAll('label'), (label) => label.textContent?.trim());

    expect(labels).toEqual([
      'Instrument count (1–50)',
      'Updates per batch (1–1000)',
      'Batch interval, ms (50–2000)',
    ]);
  });

  describe('nominal rate', () => {
    function rate(): string {
      return element().querySelector('.settings__rate')?.textContent?.trim() ?? '';
    }

    it('shows the rate of the current settings', () => {
      expect(rate()).toBe('About 625 updates per second across all instruments');
    });

    it('follows the edited values', async () => {
      await setValue('updatesPerBatch', 1000);
      await setValue('batchIntervalMs', 50);

      expect(rate()).toBe('About 20,000 updates per second across all instruments');
    });

    it('hides while a rate input is invalid', async () => {
      await setValue('batchIntervalMs', null);

      expect(rate()).toBe('');
    });

    it('hides while the batch size is invalid', async () => {
      await setValue('updatesPerBatch', 0);

      expect(rate()).toBe('');
    });
  });

  it('does not touch the producer while the form is edited', async () => {
    await setValue('instrumentCount', 3);

    expect(apply).not.toHaveBeenCalled();
  });

  it('applies the edited settings and confirms the new run', async () => {
    await setValue('instrumentCount', 3);
    await submit();

    expect(apply).toHaveBeenCalledWith({ ...CURRENT, instrumentCount: 3 });
    expect(form().pristine).toBe(true);
    expect(notification()).toBe('Applied. A new run started with these settings.');
  });

  it('hides the confirmation once the form is edited again', async () => {
    await submit();
    await setValue('batchIntervalMs', 600);

    expect(notification()).toBe('');
  });

  describe('validation', () => {
    it.each([
      ['instrumentCount', 0, 'Must be at least 1'],
      ['instrumentCount', 51, 'Must be at most 50'],
      ['updatesPerBatch', 0, 'Must be at least 1'],
      ['updatesPerBatch', 1001, 'Must be at most 1000'],
      ['batchIntervalMs', 49, 'Must be at least 50'],
      ['batchIntervalMs', 2001, 'Must be at most 2000'],
      ['batchIntervalMs', 120.5, 'Use a whole number'],
      ['updatesPerBatch', null, 'Enter a value'],
    ] as const)('rejects %s = %s', async (name, value, message) => {
      await setValue(name, value);
      await submit();

      expect(apply).not.toHaveBeenCalled();
      expect(errors()).toEqual([message]);
    });

    it('accepts the range limits', async () => {
      await setValue('instrumentCount', 50);
      await setValue('updatesPerBatch', 1);
      await setValue('batchIntervalMs', 2000);
      await submit();

      expect(apply).toHaveBeenCalledWith({ instrumentCount: 50, updatesPerBatch: 1, batchIntervalMs: 2000 });
      expect(errors()).toEqual([]);
    });
  });
});
