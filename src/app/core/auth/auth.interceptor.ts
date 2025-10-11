import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const token = localStorage.getItem('accessToken');
    const newReq = token
        ? req.clone({
              setHeaders: {
                  Authorization: `Bearer ${token}`,
              },
          })
        : req;

    return next(newReq).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                authService.signOut();
                void router.navigate(['/sign-in']);
            }

            return throwError(() => error);
        })
    );
};
