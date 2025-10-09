import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, switchMap, throwError } from 'rxjs';
import { OidcAuthService } from '../auth/oidc-auth.service';
import { environment } from '../../environments/environment';

const RETRY_HEADER = 'X-OIDC-Retry';
const identityProviderOrigin = getOrigin(environment.oidc.authority);

export const errorHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const authService = inject(OidcAuthService);
  const shouldHandle = isSecureRoute(req.url) && !isIdentityProviderRequest(req.url);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!shouldHandle) {
        return throwError(() => error);
      }

      if (isAuthError(error) && !req.headers.has(RETRY_HEADER)) {
        return authService.refreshSession().pipe(
          switchMap((refreshed) => {
            if (refreshed) {
              const token = authService.accessToken();
              const retriedRequest = req.clone({
                headers: token
                  ? req.headers.set(RETRY_HEADER, 'true').set('Authorization', `Bearer ${token}`)
                  : req.headers.set(RETRY_HEADER, 'true')
              });
              return next(retriedRequest);
            }

            authService.logout();
            return throwError(() => error);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }

      if (isAuthError(error)) {
        authService.logout();
      }

      if (error.status >= 500) {
        snackBar.open(
          $localize`Se produjo un error inesperado. Inténtalo nuevamente más tarde.`,
          $localize`Cerrar`,
          {
            duration: 5000
          }
        );
        if (!environment.production) {
          console.error('HTTP 5xx error', error);
        }
      }

      return throwError(() => error);
    })
  );
};

function isAuthError(error: HttpErrorResponse): boolean {
  return error.status === 401 || error.status === 403;
}

function isSecureRoute(url: string): boolean {
  return environment.oidc.secureRoutes.some((route) => url.startsWith(route));
}

function isIdentityProviderRequest(url: string): boolean {
  const origin = getOrigin(url);
  return !!origin && !!identityProviderOrigin && origin === identityProviderOrigin;
}

function getOrigin(url: string): string | null {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : environment.oidc.redirectUrl;
    const parsed = new URL(url, base);
    return parsed.origin;
  } catch {
    return null;
  }
}
