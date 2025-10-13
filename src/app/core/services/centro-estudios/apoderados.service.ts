import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from 'app/core/config/api.config';
import { HttpErrorService } from 'app/core/services/http-error.service';
import {
    Apoderado,
    CreateApoderadoPayload,
    UpdateApoderadoPayload,
} from 'app/core/models/centro-estudios/apoderado.model';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

@Injectable({ providedIn: 'root' })
export class ApoderadosService {
    private readonly http = inject(HttpClient);
    private readonly apiConfig = inject(API_CONFIG);
    private readonly errorService = inject(HttpErrorService);

    list(): Observable<Apoderado[]> {
        return this.http
            .get<Apoderado[]>(this.buildUrl(CENTRO_ESTUDIOS_API.apoderados))
            .pipe(
                map((response) => response ?? []),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    getByDocumento(documento: string): Observable<Apoderado | null> {
        const encodedDocumento = encodeURIComponent(documento);

        return this.http
            .get<Apoderado>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.apoderados)}/documento/${encodedDocumento}`
            )
            .pipe(
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of(null);
                    }

                    return throwError(() =>
                        this.errorService.createError(error)
                    );
                })
            );
    }

    // Search for apoderados by term in documento, apellidos, or nombres
    search(term: string): Observable<Apoderado[]> {
        const normalized = term.trim().toLowerCase();
        return this.list().pipe(
            map((apoderados) => {
                if (!normalized) {
                    return apoderados;
                }

                return apoderados.filter((apoderado) => {
                    const searchable = [
                        apoderado.documento,
                        apoderado.apellidos,
                        apoderado.nombres,
                    ]
                        .filter((value): value is string => !!value)
                        .map((value) => value.toLowerCase())
                        .join(' ');

                    return searchable.includes(normalized);
                });
            })
        );
    }

    get(id: number): Observable<Apoderado> {
        return this.http
            .get<Apoderado>(`${this.buildUrl(CENTRO_ESTUDIOS_API.apoderados)}/${id}`)
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    create(payload: CreateApoderadoPayload): Observable<Apoderado> {
        return this.http
            .post<Apoderado>(
                this.buildUrl(CENTRO_ESTUDIOS_API.apoderados),
                payload
            )
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    update(id: number, payload: UpdateApoderadoPayload): Observable<Apoderado> {
        return this.http
            .put<Apoderado>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.apoderados)}/${id}`,
                payload
            )
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    remove(id: number): Observable<void> {
        return this.http
            .delete<void>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.apoderados)}/${id}`
            )
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    private buildUrl(endpoint: string): string {
        const baseUrl = this.apiConfig.baseUrl.replace(/\/$/, '');
        const sanitizedEndpoint = endpoint.replace(/^\/+/, '');
        return `${baseUrl}/${sanitizedEndpoint}`;
    }
}
