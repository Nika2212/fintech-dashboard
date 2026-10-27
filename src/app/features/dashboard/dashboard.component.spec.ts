import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, NEVER } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideTaiga } from '@taiga-ui/core';
import { DashboardComponent } from './dashboard.component';
import { MarketService } from '../../core/services/market.service';
import { NUMBER_FORMAT_PROVIDER } from '../../app.config';
import { createEmptyMetrics } from '../../core/utils/instrument-metrics.util';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';

const ALFA: IInstrumentMetrics = {
  instrumentId: 0,
  symbol: 'ALFA',
  lastTradePriceCents: 10200,
  spreadCents: 4,
  volume: 1234567,
  vwapCents: 10150,
  imbalance: 0.2,
};

const BETA: IInstrumentMetrics = {
  instrumentId: 1,
  symbol: 'BETA',
  lastTradePriceCents: 500,
  spreadCents: 2,
  volume: 3,
  vwapCents: 500,
  imbalance: -1,
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let instruments: BehaviorSubject<IInstrumentMetrics[]>;
  let errorMessage: BehaviorSubject<string | null>;

  beforeEach(async () => {
    instruments = new BehaviorSubject<IInstrumentMetrics[]>([ALFA, BETA]);
    errorMessage = new BehaviorSubject<string | null>(null);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideTaiga(),
        NUMBER_FORMAT_PROVIDER,
        {
          provide: MarketService,
          useValue: { getInstrumentMetrics: () => instruments, getErrorMessage: () => errorMessage },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(selector: string): string {
    return element().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function rows(): string[][] {
    return Array.from(element().querySelectorAll('tbody tr'), (row) =>
      Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
    );
  }

  function imbalanceValue(row: number): HTMLElement {
    return element().querySelectorAll('tbody tr')[row].querySelector('.dashboard__imbalance-value') as HTMLElement;
  }

  function imbalanceBars(row: number): HTMLProgressElement[] {
    return Array.from(element().querySelectorAll('tbody tr')[row].querySelectorAll('progress'));
  }

  async function update(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows the page heading', () => {
    expect(text('h2')).toBe('Dashboard');
  });

  describe('card', () => {
    it('is titled with the number of instruments', () => {
      expect(text('h3')).toBe('Instruments');
      expect(text('[tuiSubtitle]')).toBe('2 instruments · totals since the current run started');
    });

    it('names the metric columns', () => {
      const headers = Array.from(element().querySelectorAll('thead th'), (cell) => cell.textContent?.trim());

      expect(headers).toEqual(['Instrument', 'Last price', 'Bid–ask spread', 'Volume', 'VWAP', 'Book Imbalance']);
    });
  });

  describe('metrics table', () => {
    it('shows the worked example as currency, grouped volume and a signed imbalance', () => {
      expect(rows()[0]).toEqual(['ALFA', '$102.00', '$0.04', '1,234,567', '$101.50', '+0.20']);
    });

    it('labels each row with the instrument symbol', () => {
      expect(rows().map((row) => row[0])).toEqual(['ALFA', 'BETA']);
    });

    it('shows a negative imbalance with a minus sign', () => {
      expect(rows()[1][5]).toBe('−1.00');
    });

    it('shows unavailable values and zero volume before data arrives', async () => {
      instruments.next(createEmptyMetrics(1));
      await update();

      expect(rows()).toEqual([['ALFA', 'Not available', 'Not available', '0', 'Not available', 'Not available']]);
    });

    it('updates the rows when new metrics arrive', async () => {
      instruments.next([{ ...ALFA, volume: 41 }]);
      await update();

      expect(rows()).toHaveLength(1);
      expect(rows()[0][3]).toBe('41');
    });
  });

  describe('book imbalance', () => {
    it('fills only the bid side, in the positive color, for a positive imbalance', () => {
      const [askSide, bidSide] = imbalanceBars(0);

      expect(askSide.value).toBe(0);
      expect(bidSide.value).toBeCloseTo(0.2);
      expect(bidSide.getAttribute('color')).toBe('#a7abfe');
      expect(imbalanceValue(0).classList).toContain('dashboard__imbalance-value--positive');
    });

    it('fills only the ask side, in the negative color, for a negative imbalance', () => {
      const [askSide, bidSide] = imbalanceBars(1);

      expect(askSide.value).toBe(1);
      expect(bidSide.value).toBe(0);
      expect(askSide.getAttribute('color')).toBe('#fb9c72');
      expect(imbalanceValue(1).classList).toContain('dashboard__imbalance-value--negative');
    });

    it('uses neither color for a balanced book', async () => {
      instruments.next([{ ...ALFA, imbalance: 0 }]);
      await update();

      expect(imbalanceValue(0).className).toBe('dashboard__imbalance-value');
    });
  });

  describe('errors', () => {
    it('shows no error while the producer is healthy', () => {
      expect(element().querySelector('[role=alert]')).toBeNull();
    });

    it('shows the producer error message', async () => {
      errorMessage.next('Wasm is not available');
      await update();

      expect(text('[role=alert]')).toBe('Wasm is not available');
    });
  });

  it('renders nothing until the producer state is known', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideTaiga(),
        { provide: MarketService, useValue: { getInstrumentMetrics: () => NEVER, getErrorMessage: () => NEVER } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    await fixture.whenStable();

    expect(element().querySelector('table')).toBeNull();
  });
});
