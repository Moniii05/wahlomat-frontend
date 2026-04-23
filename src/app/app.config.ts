import { ApplicationConfig, provideZoneChangeDetection, isDevMode } from '@angular/core';
import {provideRouter, withInMemoryScrolling} from '@angular/router';

// damit service funktioniert
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { jwtInterceptor } from './shared/interceptors/jwt.interceptor';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(
       withInterceptors([jwtInterceptor])
  ),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top', // Scrollt immer nach oben
        anchorScrolling: 'enabled'
      })
    ),
    provideTransloco({
        config: {
          availableLangs: ['de', 'en'],
          defaultLang: 'de',
          reRenderOnLangChange: true,
          prodMode: !isDevMode(),
        },
        loader: TranslocoHttpLoader
      })
 ]
};

