import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from './app.config';
import { MarketService } from './core/services/market.service';
import { MarketWorkerService } from './core/services/market-worker.service';

describe('appConfig', () => {
  let createMarketService: () => object;
  let createMarketWorkerService: () => object;

  beforeEach(() => {
    createMarketService = vi.fn(() => ({}));
    createMarketWorkerService = vi.fn(() => ({}));

    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: MarketService, useFactory: createMarketService },
        { provide: MarketWorkerService, useFactory: createMarketWorkerService },
      ],
    });
  });

  it('starts the producer once when the application starts', async () => {
    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(createMarketService).toHaveBeenCalledTimes(1);
    expect(createMarketWorkerService).toHaveBeenCalledTimes(1);
  });
});
