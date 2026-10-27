import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideTaiga } from '@taiga-ui/core';
import { App } from './app';
import { MarketService } from './core/services/market.service';
import { WorkerStatuses } from './core/enums/worker-statuses.enum';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideTaiga(),
        { provide: MarketService, useValue: { getWorkerStatus: () => of(WorkerStatuses.RUNNING) } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the dark Taiga root with the layout', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('tui-root')?.getAttribute('tuiTheme')).toBe('dark');
    expect(compiled.querySelector('app-sidebar')).not.toBeNull();
    expect(compiled.querySelector('app-header')).not.toBeNull();
  });
});
