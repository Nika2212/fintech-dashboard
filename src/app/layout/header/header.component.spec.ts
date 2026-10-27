import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, NEVER } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTaiga } from '@taiga-ui/core';
import { HeaderComponent } from './header.component';
import { MarketService } from '../../core/services/market.service';
import { WorkerStatuses } from '../../core/enums/worker-statuses.enum';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let status: BehaviorSubject<WorkerStatuses>;
  let marketService: { pause: () => void; resume: () => void };

  async function create(statusStream = status): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideTaiga(),
        { provide: MarketService, useValue: { ...marketService, getWorkerStatus: () => statusStream } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    status = new BehaviorSubject<WorkerStatuses>(WorkerStatuses.RUNNING);
    marketService = { pause: vi.fn(), resume: vi.fn() };
    await create();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(selector: string): string {
    return element().querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  function controlButton(): HTMLButtonElement {
    return element().querySelector('button') as HTMLButtonElement;
  }

  async function update(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  describe('producer status and controls', () => {
    it('shows the running status and a pause button', () => {
      expect(text('[role=status]')).toBe('Producer: Running');
      expect(controlButton().textContent?.trim()).toBe('Pause');
      expect(controlButton().disabled).toBe(false);
    });

    it('pauses the producer', () => {
      controlButton().click();

      expect(marketService.pause).toHaveBeenCalledTimes(1);
    });

    it('offers resume while paused', async () => {
      status.next(WorkerStatuses.PAUSED);
      await update();

      expect(text('[role=status]')).toBe('Producer: Paused');
      expect(controlButton().textContent?.trim()).toBe('Resume');

      controlButton().click();
      expect(marketService.resume).toHaveBeenCalledTimes(1);
    });

    it('disables pause when the producer is idle', async () => {
      status.next(WorkerStatuses.IDLE);
      await update();

      expect(text('[role=status]')).toBe('Producer: Idle');
      expect(controlButton().disabled).toBe(true);
    });

    it('disables pause when the producer has failed', async () => {
      status.next(WorkerStatuses.FAILED);
      await update();

      expect(text('[role=status]')).toBe('Producer: Failed');
      expect(controlButton().disabled).toBe(true);
    });

    it('shows no controls until the producer status is known', async () => {
      TestBed.resetTestingModule();
      await create(NEVER as unknown as BehaviorSubject<WorkerStatuses>);

      expect(element().querySelector('[role=status]')).toBeNull();
      expect(controlButton()).toBeNull();
    });
  });
});
