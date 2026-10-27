import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { combineLatest, map, Observable } from 'rxjs';
import { TuiNotification, TuiTitle } from '@taiga-ui/core';
import { TuiFormatNumberPipe, TuiProgressBar } from '@taiga-ui/kit';
import { TuiTable } from '@taiga-ui/addon-table';
import { TuiAmountPipe } from '@taiga-ui/addon-commerce';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { MarketService } from '../../core/services/market.service';
import { CentsToDollarsPipe } from '../../shared/pipes/cents-to-dollars.pipe';
import { IInstrumentMetrics } from '../../shared/interfaces/instrument-metrics.interface';

interface IDashboardView {
  instruments: IInstrumentMetrics[];
  errorMessage: string | null;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    AsyncPipe,
    CentsToDollarsPipe,
    TuiAmountPipe,
    TuiCardLarge,
    TuiFormatNumberPipe,
    TuiHeader,
    TuiNotification,
    TuiProgressBar,
    TuiTable,
    TuiTitle,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly marketService: MarketService = inject(MarketService);

  protected readonly view$: Observable<IDashboardView> = combineLatest([
    this.marketService.getInstrumentMetrics(),
    this.marketService.getErrorMessage(),
  ]).pipe(map(([instruments, errorMessage]) => ({ instruments, errorMessage })));
}
