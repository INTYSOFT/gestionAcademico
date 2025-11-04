import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';
import {
    CreateEvaluacionPayload,
    Evaluacion,
    UpdateEvaluacionPayload,
} from 'app/core/models/centro-estudios/evaluacion.model';

interface EvaluacionApi extends Partial<Evaluacion> {
    Id?: number | string;
    EvaluacionProgramadaId?: number | string;
    AlumnoId?: number | string;
    SedeId?: number | string | null;
    CicloId?: number | string | null;
    SeccionId?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionesService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluaciones;

    listBySedeCicloAlumno(
        sedeId: number,
        cicloId: number,
        alumnoId: number
    ): Observable<Evaluacion[]> {
        const url = `${this.resourcePath}/sede/${sedeId}/ciclo/${cicloId}/alumno/${alumnoId}`;

        return this.http
            .get<EvaluacionApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listBySedeCiclo(
        sedeId: number,
        cicloId: number
    ): Observable<Evaluacion[]> {
        const url = `${this.resourcePath}/sede/${sedeId}/ciclo/${cicloId}`;

        return this.http
            .get<EvaluacionApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listBySedeCicloSeccion(
        sedeId: number,
        cicloId: number,
        seccionId: number
    ): Observable<Evaluacion[]> {
        const url = `${this.resourcePath}/sede/${sedeId}/ciclo/${cicloId}/seccion/${seccionId}`;

        return this.http
            .get<EvaluacionApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    //[HttpGet("evaluacionProgramada/{evaluacionProgramadaId}/alumno/{alumnoId}")]
    getByEvaluacionProgramadaAndAlumno(
        evaluacionProgramadaId: number,
        alumnoId: number
    ): Observable<Evaluacion[]> {
        const url = `${this.resourcePath}/evaluacionProgramada/${evaluacionProgramadaId}/alumno/${alumnoId}`;

        return this.http
            .get<EvaluacionApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    //[HttpGet("evaluacionProgramadaId/{evaluacionProgramadaId}")]
    listByEvaluacionProgramada(
        evaluacionProgramadaId: number
    ): Observable<Evaluacion[]> {
        const url = `${this.resourcePath}/evaluacionProgramadaId/${evaluacionProgramadaId}`;
        return this.http
            .get<EvaluacionApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }
                    return this.handleError(error);
                })
            );
    }

    create(payload: CreateEvaluacionPayload): Observable<Evaluacion> {
        const body = this.mapPayloadToApi(payload);

        return this.post<EvaluacionApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionOrThrow(response))
        );
    }

    update(id: number, payload: UpdateEvaluacionPayload): Observable<Evaluacion> {
        const body: EvaluacionApi = {
            id,
            Id: id,
            ...this.mapPayloadToApi(payload),
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEvaluacion(id))
        );
    }

    private getEvaluacion(id: number): Observable<Evaluacion> {
        return this.get<EvaluacionApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionOrThrow(response))
        );
    }

    private mapPayloadToApi(
        payload: CreateEvaluacionPayload | UpdateEvaluacionPayload
    ): EvaluacionApi {
        const normalized: EvaluacionApi = {};

        if (payload.evaluacionProgramadaId !== undefined) {
            normalized.evaluacionProgramadaId = payload.evaluacionProgramadaId;
            normalized.EvaluacionProgramadaId = payload.evaluacionProgramadaId;
        }

        if (payload.alumnoId !== undefined) {
            normalized.alumnoId = payload.alumnoId;
            normalized.AlumnoId = payload.alumnoId;
        }

        if (payload.sedeId !== undefined) {
            normalized.sedeId = payload.sedeId;
            normalized.SedeId = payload.sedeId;
        }

        if (payload.cicloId !== undefined) {
            normalized.cicloId = payload.cicloId;
            normalized.CicloId = payload.cicloId;
        }

        if (payload.seccionId !== undefined) {
            normalized.seccionId = payload.seccionId;
            normalized.SeccionId = payload.seccionId;
        }

        if (payload.activo !== undefined) {
            normalized.activo = payload.activo;
            normalized.Activo = payload.activo;
        }

        return normalized;
    }

    private normalizeEvaluaciones(
        response: EvaluacionApi[] | null | undefined
    ): Evaluacion[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacion(item))
            .filter((evaluacion): evaluacion is Evaluacion => evaluacion !== null);
    }

    private normalizeEvaluacion(
        raw: EvaluacionApi | null | undefined
    ): Evaluacion | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const evaluacionProgramadaId = this.coerceNumber(
            raw.evaluacionProgramadaId ?? raw.EvaluacionProgramadaId
        );
        const alumnoId = this.coerceNumber(raw.alumnoId ?? raw.AlumnoId);
        const sedeId = this.coerceOptionalNumber(raw.sedeId ?? raw.SedeId);
        const cicloId = this.coerceOptionalNumber(raw.cicloId ?? raw.CicloId);
        const seccionId = this.coerceOptionalNumber(raw.seccionId ?? raw.SeccionId);

        if (id === null || evaluacionProgramadaId === null || alumnoId === null) {
            return null;
        }

        return {
            id,
            evaluacionProgramadaId,
            alumnoId,
            sedeId,
            cicloId,
            seccionId,
            activo: this.coerceBoolean(raw.activo ?? raw.Activo, true),
            fechaRegistro: this.coerceOptionalString(raw.fechaRegistro ?? raw.FechaRegistro),
            fechaActualizacion: this.coerceOptionalString(
                raw.fechaActualizacion ?? raw.FechaActualizacion
            ),
            usuaraioRegistroId: this.coerceOptionalNumber(
                raw.usuaraioRegistroId ?? raw.UsuaraioRegistroId
            ),
            usuaraioActualizacionId: this.coerceOptionalNumber(
                raw.usuaraioActualizacionId ?? raw.UsuaraioActualizacionId
            ),
        };
    }

    private normalizeEvaluacionOrThrow(raw: EvaluacionApi | null | undefined): Evaluacion {
        const evaluacion = this.normalizeEvaluacion(raw);

        if (!evaluacion) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return evaluacion;
    }

    private coerceNumber(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim();

            if (!normalized) {
                return null;
            }

            const parsed = Number(normalized);
            return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
    }

    private coerceOptionalNumber(value: unknown): number | null {
        return this.coerceNumber(value);
    }

    private coerceOptionalString(value: unknown): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (typeof value === 'number' && !Number.isNaN(value)) {
            return String(value);
        }

        return null;
    }

    private coerceBoolean(value: unknown, defaultValue = false): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'number') {
            return value !== 0;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();

            if (!normalized) {
                return defaultValue;
            }

            return normalized === 'true' || normalized === '1' || normalized === 'si';
        }

        return defaultValue;
    }
}
