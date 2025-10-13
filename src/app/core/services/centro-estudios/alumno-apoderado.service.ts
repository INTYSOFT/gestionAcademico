import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from 'app/core/config/api.config';
import { HttpErrorService } from 'app/core/services/http-error.service';
import {
    AlumnoApoderado,
    CreateAlumnoApoderadoPayload,
    UpdateAlumnoApoderadoPayload,
} from 'app/core/models/centro-estudios/alumno-apoderado.model';
import { Observable, catchError, map, throwError } from 'rxjs';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

@Injectable({ providedIn: 'root' })
export class AlumnoApoderadoService {
    private readonly http = inject(HttpClient);
    private readonly apiConfig = inject(API_CONFIG);
    private readonly errorService = inject(HttpErrorService);

    listByAlumno(alumnoId: number): Observable<AlumnoApoderado[]> {
        return this.http
            .get<AlumnoApoderado[]>(
                this.buildUrl(`${CENTRO_ESTUDIOS_API.alumnoApoderados}/alumnoId/${alumnoId}`)
            )
            .pipe(
                map(r => r ?? []),
                catchError(err => throwError(() => this.errorService.createError(err)))
            );
    }

    link(
        alumnoId: number,
        apoderadoId: number,
        parentescoId: number
    ): Observable<AlumnoApoderado> {
        const payload: CreateAlumnoApoderadoPayload = {
            alumnoId,
            apoderadoId,
            parentescoId,
        };

        return this.http
            .post<AlumnoApoderado>(
                this.buildUrl(CENTRO_ESTUDIOS_API.alumnoApoderados),
                payload
            )
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    updateLink(id: number, parentescoId: number): Observable<AlumnoApoderado> {
        const payload: UpdateAlumnoApoderadoPayload = { parentescoId };
        return this.http
            .put<AlumnoApoderado>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.alumnoApoderados)}/${id}`,
                payload
            )
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    unlink(id: number): Observable<void> {
        return this.http
            .delete<void>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.alumnoApoderados)}/${id}`
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
