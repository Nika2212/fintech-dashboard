import { provideTaiga, tuiNumberFormatProvider } from "@taiga-ui/core";
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { MarketWorkerService } from './core/services/market-worker.service';
import { MarketService } from './core/services/market.service';

export const NUMBER_FORMAT_PROVIDER: Provider = tuiNumberFormatProvider({ thousandSeparator: ',', rounding: 'round', decimalMode: 'always' });

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideTaiga(),
    NUMBER_FORMAT_PROVIDER,
    provideAppInitializer(() => {
      inject(MarketService);
      inject(MarketWorkerService);
    }),
  ]
};
