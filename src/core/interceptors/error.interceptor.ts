import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { OidcAuthService } from '../auth/oidc-auth.service';
import { RETRY_REQUEST_CONTEXT } from './auth.interceptor';

function isSecureRoute(url: string): boolean {
  return environment.oidc.secureRoutes.some((route) => url.startsWith(route));
}

export const errorHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(OidcAuthService);
  const snackBar = inject(MatSnackBar);
  const hasRetried = req.context.get(RETRY_REQUEST_CONTEXT);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isSecureRoute(req.url) && (error.status === 401 || error.status === 403) && !hasRetried) {
        return authService.refreshSession().pipe(
          switchMap((result) => {
            if (!result?.isAuthenticated) {
              authService.logout();
              return throwError(() => error);
            }

            const token = authService.accessToken();
            if (!token) {
              authService.logout();
              return throwError(() => error);
            }

            const retriedRequest = req.clone({
              context: req.context.set(RETRY_REQUEST_CONTEXT, true),
              setHeaders: { Authorization: `Bearer ${token}` }
            });

            return next(retriedRequest);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      if (error.status >= 500 && error.status < 600) {
        const message = environment.production
          ? 'Ocurrió un error inesperado. Inténtalo más tarde.'
          : error.message || 'Error en el servidor';
        snackBar.open(message, 'Cerrar', {
          duration: 5000
        });
        if (!environment.production) {
          console.error('HTTP error interceptor', error);
        }
      }

      return throwError(() => error);
    })
  );
};
