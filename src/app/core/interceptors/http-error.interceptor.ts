import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandlerFn,
    HttpInterceptorFn,
    HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpErrorService } from 'app/core/services/http-error.service';
import { Observable, catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const errorService = inject(HttpErrorService);

    return next(req).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse) {
                errorService.notifyHttpError(error);
            }

            return throwError(() => error);
        })
    );
};
