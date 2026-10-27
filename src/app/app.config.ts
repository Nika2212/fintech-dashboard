import { provideTaiga } from "@taiga-ui/core";
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { MarketWorkerService } from './core/services/market-worker.service';
import { MarketService } from './core/services/market.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTaiga(),
    provideAppInitializer(() => {
      inject(MarketService);
      inject(MarketWorkerService);
    }),
  ]
};
