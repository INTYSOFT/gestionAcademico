import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, Component, LOCALE_ID, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, RouterOutlet, withComponentInputBinding } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { routes } from './app.routes';
import { authHttpInterceptor } from './core/interceptors/auth.interceptor';
import { errorHttpInterceptor } from './core/interceptors/error.interceptor';
import { provideOidcConfig } from './core/auth/oidc.config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {}

export const createAppConfig = (locale: string): ApplicationConfig => ({
  providers: [
    { provide: LOCALE_ID, useValue: locale },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authHttpInterceptor, errorHttpInterceptor])),
    provideAnimations(),
    ...provideOidcConfig(),
    importProvidersFrom(
      MatIconModule,
      MatButtonModule,
      MatToolbarModule,
      MatSidenavModule,
      MatListModule,
      MatMenuModule,
      MatTableModule,
      MatSnackBarModule,
      MatDividerModule
    )
  ]
});
