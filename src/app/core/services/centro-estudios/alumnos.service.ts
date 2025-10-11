import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from 'app/core/config/api.config';
import { HttpErrorService } from 'app/core/services/http-error.service';
import {
    Alumno,
    CreateAlumnoPayload,
    UpdateAlumnoPayload,
} from 'app/core/models/centro-estudios/alumno.model';
import { Observable, catchError, map, throwError } from 'rxjs';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

@Injectable({ providedIn: 'root' })
export class AlumnosService {
    private readonly http = inject(HttpClient);
    private readonly apiConfig = inject(API_CONFIG);
    private readonly errorService = inject(HttpErrorService);

    list(params?: HttpParams): Observable<Alumno[]> {
        return this.http
            .get<Alumno[]>(this.buildUrl(CENTRO_ESTUDIOS_API.alumnos), { params })
            .pipe(
                map((response) => response ?? []),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    get(id: number): Observable<Alumno> {
        return this.http
            .get<Alumno>(`${this.buildUrl(CENTRO_ESTUDIOS_API.alumnos)}/${id}`)
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    create(payload: CreateAlumnoPayload): Observable<Alumno> {
        return this.http
            .post<Alumno>(this.buildUrl(CENTRO_ESTUDIOS_API.alumnos), payload)
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    updatePartial(id: number, payload: UpdateAlumnoPayload): Observable<Alumno> {
        return this.http
            .patch<Alumno>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.alumnos)}/${id}`,
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
                `${this.buildUrl(CENTRO_ESTUDIOS_API.alumnos)}/${id}`
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
