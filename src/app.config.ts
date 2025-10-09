import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideZoneChangeDetection } from '@angular/core';
import { provideMatIconRegistry } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { routes } from './app.routes';
import { authHttpInterceptor } from './core/interceptors/auth.interceptor';
import { errorHttpInterceptor } from './core/interceptors/error.interceptor';
import { provideOidc } from './core/auth/oidc.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authHttpInterceptor, errorHttpInterceptor])),
    provideAnimations(),
    provideMatIconRegistry(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    importProvidersFrom(MatSnackBarModule),
    provideOidc()
  ]
};
