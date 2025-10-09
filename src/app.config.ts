import { ApplicationConfig, Component, importProvidersFrom } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideZoneChangeDetection } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
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

export const appConfig: ApplicationConfig = {
  providers: [
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
};
