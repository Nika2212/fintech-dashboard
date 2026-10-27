import { Injectable } from '@angular/core';
import { IWorkerResponse } from '../../shared/interfaces/worker-response.interface';
import { Observable, Subject } from 'rxjs';
import { IWorkerRequest } from '../../shared/interfaces/worker-request.interface';

@Injectable({ providedIn: 'root' })
export class MarketWorkerService {
  private worker: Worker | null = null;
  private onMessage$: Subject<IWorkerResponse> = new Subject<IWorkerResponse>();

  constructor() {
    this.initWorker();
    this.setEvents();
  }

  private initWorker(): void {
    this.worker = new Worker(new URL('../workers/market.worker', import.meta.url), { type: 'module' });
  }

  private setEvents(): void {
    this.worker?.addEventListener('message', (event: MessageEvent<IWorkerResponse>) => this.onMessage$.next(event.data));
  }

  public dispatch(request: IWorkerRequest): void {
    this.worker?.postMessage(request);
  }

  public onMessage(): Observable<IWorkerResponse> {
    return this.onMessage$;
  }
}
