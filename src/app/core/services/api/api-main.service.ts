import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from 'app/core/config/api.config';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiMainService {
    protected readonly http = inject(HttpClient);
    protected readonly config = inject(API_CONFIG);

    protected get baseUrl(): string {
        return this.config.baseUrl.replace(/\/$/, '');
    }

    protected get defaultHeaders(): HttpHeaders {
        const headers = new HttpHeaders(this.config.defaultHeaders ?? {});
        if (!headers.has('Content-Type')) {
            return headers.set('Content-Type', 'application/json');
        }

        return headers;
    }

    protected buildUrl(endpoint: string): string {
        const sanitizedEndpoint = endpoint.replace(/^\/+/, '');
        return `${this.baseUrl}/${sanitizedEndpoint}`;
    }

    protected createOptions(options?: {
        headers?: HttpHeaders | { [header: string]: string | string[] };
        params?: HttpParams | {
            [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean>;
        };
        reportProgress?: boolean;
        responseType?: 'json';
        withCredentials?: boolean;
    }) {
        let headers = this.defaultHeaders;

        if (options?.headers) {
            const incomingHeaders =
                options.headers instanceof HttpHeaders
                    ? options.headers
                    : new HttpHeaders(options.headers);

            incomingHeaders.keys().forEach((key) => {
                const value = incomingHeaders.getAll(key);
                if (value) {
                    headers = headers.set(key, value);
                }
            });
        }

        const { headers: _ignored, ...rest } = options ?? {};

        return {
            headers,
            ...rest,
        };
    }

    protected handleError(error: HttpErrorResponse): Observable<never> {
        let message = 'Error de identificación desconocido.';

        if (error.error instanceof ErrorEvent) {
            message = error.error.message || message;
        } else if (typeof error.error === 'string' && error.error.trim().length > 0) {
            message = error.error;
        } else if (error.error?.message) {
            message = error.error.message;
        } else if (error.message) {
            message = error.message;
        }

        return throwError(() => new Error(message));
    }

    protected get<T>(endpoint: string, options?: Parameters<typeof this.createOptions>[0]): Observable<T> {
        return this.http
            .get<T>(this.buildUrl(endpoint), this.createOptions(options))
            .pipe(
                retry(this.config.retryAttempts),
                catchError((error) => this.handleError(error))
            );
    }

    protected post<T>(endpoint: string, body: unknown, options?: Parameters<typeof this.createOptions>[0]): Observable<T> {
        return this.http
            .post<T>(this.buildUrl(endpoint), body, this.createOptions(options))
            .pipe(
                retry(this.config.retryAttempts),
                catchError((error) => this.handleError(error))
            );
    }

    protected patch<T>(endpoint: string, body: unknown, options?: Parameters<typeof this.createOptions>[0]): Observable<T> {
        return this.http
            .patch<T>(this.buildUrl(endpoint), body, this.createOptions(options))
            .pipe(
                retry(this.config.retryAttempts),
                catchError((error) => this.handleError(error))
            );
    }
}
