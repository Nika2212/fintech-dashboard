import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import { TuiStatus } from '@taiga-ui/kit';
import { MarketService } from '../../core/services/market.service';
import { WorkerStatuses } from '../../core/enums/worker-statuses.enum';

interface IStatusView {
  label: string;
  color: string;
}

const STATUS_VIEWS: Record<WorkerStatuses, IStatusView> = {
  [WorkerStatuses.IDLE]: { label: 'Idle', color: 'var(--tui-status-neutral)' },
  [WorkerStatuses.RUNNING]: { label: 'Running', color: 'var(--tui-status-positive)' },
  [WorkerStatuses.PAUSED]: { label: 'Paused', color: 'var(--tui-status-warning)' },
  [WorkerStatuses.FAILED]: { label: 'Failed', color: 'var(--tui-status-negative)' },
};

@Component({
  selector: 'app-header',
  imports: [AsyncPipe, TuiButton, TuiStatus],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly marketService: MarketService = inject(MarketService);

  protected readonly statuses: typeof WorkerStatuses = WorkerStatuses;

  protected readonly status$: Observable<WorkerStatuses> = this.marketService.getWorkerStatus();

  protected statusView(status: WorkerStatuses): IStatusView {
    return STATUS_VIEWS[status];
  }

  protected pause(): void {
    this.marketService.pause();
  }

  protected resume(): void {
    this.marketService.resume();
  }
}
