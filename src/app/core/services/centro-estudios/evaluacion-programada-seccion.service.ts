import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateEvaluacionProgramadaSeccionPayload,
    EvaluacionProgramadaSeccion,
    UpdateEvaluacionProgramadaSeccionPayload,
} from 'app/core/models/centro-estudios/evaluacion-programada-seccion.model';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface EvaluacionProgramadaSeccionApi extends Partial<EvaluacionProgramadaSeccion> {
    Id?: number | string;
    EvaluacionProgramadaId?: number | string;
    SeccionCicloId?: number | string;
    SeccionId?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionProgramadaSeccionService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionProgramadaSecciones;

    listByEvaluacionProgramada(
        evaluacionProgramadaId: number
    ): Observable<EvaluacionProgramadaSeccion[]> {
        const url = `${this.resourcePath}/evaluacion_programada/${evaluacionProgramadaId}`;

        return this.http
            .get<EvaluacionProgramadaSeccionApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionSecciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    create(
        payload: CreateEvaluacionProgramadaSeccionPayload
    ): Observable<EvaluacionProgramadaSeccion> {
        const body: EvaluacionProgramadaSeccionApi = this.buildRequestBody(payload);

        return this.post<EvaluacionProgramadaSeccionApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionSeccionOrThrow(response))
        );
    }

    update(
        id: number,
        payload: UpdateEvaluacionProgramadaSeccionPayload
    ): Observable<EvaluacionProgramadaSeccion> {
        const body: EvaluacionProgramadaSeccionApi = {
            id,
            Id: id,
            ...this.buildRequestBody(payload),
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            map(() => ({ id, ...payload } as EvaluacionProgramadaSeccion)),
            catchError((error) => this.handleError(error))
        );
    }

    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(this.buildUrl(`${this.resourcePath}/${id}`), this.createOptions())
            .pipe(catchError((error) => this.handleError(error)));
    }

    createMany(
        payloads: CreateEvaluacionProgramadaSeccionPayload[]
    ): Observable<EvaluacionProgramadaSeccion[]> {
        if (payloads.length === 0) {
            return of([]);
        }

        return forkJoin(payloads.map((payload) => this.create(payload)));
    }

    private buildRequestBody(
        payload:
            | CreateEvaluacionProgramadaSeccionPayload
            | UpdateEvaluacionProgramadaSeccionPayload
    ): EvaluacionProgramadaSeccionApi {
        const body: EvaluacionProgramadaSeccionApi = {};

        if (payload.evaluacionProgramadaId !== undefined) {
            body.evaluacionProgramadaId = payload.evaluacionProgramadaId;
            body.EvaluacionProgramadaId = payload.evaluacionProgramadaId;
        }

        if (payload.seccionCicloId !== undefined) {
            body.seccionCicloId = payload.seccionCicloId;
            body.SeccionCicloId = payload.seccionCicloId;
        }

        if (payload.seccionId !== undefined) {
            body.seccionId = payload.seccionId;
            body.SeccionId = payload.seccionId;
        }

        if (payload.activo !== undefined) {
            body.activo = payload.activo;
            body.Activo = payload.activo;
        }

        return body;
    }

    private normalizeEvaluacionSecciones(
        response: EvaluacionProgramadaSeccionApi[] | null | undefined
    ): EvaluacionProgramadaSeccion[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacionSeccion(item))
            .filter(
                (evaluacionSeccion): evaluacionSeccion is EvaluacionProgramadaSeccion =>
                    evaluacionSeccion !== null
            );
    }

    private normalizeEvaluacionSeccion(
        raw: EvaluacionProgramadaSeccionApi | null | undefined
    ): EvaluacionProgramadaSeccion | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const evaluacionProgramadaId = this.coerceNumber(
            raw.evaluacionProgramadaId ?? raw.EvaluacionProgramadaId
        );
        const seccionCicloId = this.coerceNumber(raw.seccionCicloId ?? raw.SeccionCicloId);

        if (id === null || evaluacionProgramadaId === null || seccionCicloId === null) {
            return null;
        }

        return {
            id,
            evaluacionProgramadaId,
            seccionCicloId,
            seccionId: this.coerceOptionalNumber(raw.seccionId ?? raw.SeccionId),
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

    private normalizeEvaluacionSeccionOrThrow(
        raw: EvaluacionProgramadaSeccionApi | null | undefined
    ): EvaluacionProgramadaSeccion {
        const evaluacionSeccion = this.normalizeEvaluacionSeccion(raw);

        if (!evaluacionSeccion) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return evaluacionSeccion;
    }

    private coerceNumber(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
        }

        if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number(value);
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
