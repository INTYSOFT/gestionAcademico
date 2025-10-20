import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateEvaluacionTipoPreguntaPayload,
    EvaluacionTipoPregunta,
    UpdateEvaluacionTipoPreguntaPayload,
} from 'app/core/models/centro-estudios/evaluacion-tipo-pregunta.model';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface EvaluacionTipoPreguntaApi extends Partial<EvaluacionTipoPregunta> {
    Id?: number | string;
    Nombre?: string | null;
    Codigo?: string | null;
    Descripcion?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionTipoPreguntasService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionTipoPreguntas;

    listAll(): Observable<EvaluacionTipoPregunta[]> {
        return this.http
            .get<EvaluacionTipoPreguntaApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionTipoPreguntas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getEvaluacionTipoPregunta(id: number): Observable<EvaluacionTipoPregunta> {
        return this.get<EvaluacionTipoPreguntaApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionTipoPreguntaOrThrow(response))
        );
    }

    createEvaluacionTipoPregunta(
        payload: CreateEvaluacionTipoPreguntaPayload
    ): Observable<EvaluacionTipoPregunta> {
        const body: EvaluacionTipoPreguntaApi = {
            nombre: payload.nombre,
            codigo: payload.codigo,
            descripcion: payload.descripcion ?? null,
            activo: payload.activo,
        };

        return this.post<EvaluacionTipoPreguntaApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionTipoPreguntaOrThrow(response))
        );
    }

    updateEvaluacionTipoPregunta(
        id: number,
        payload: UpdateEvaluacionTipoPreguntaPayload
    ): Observable<EvaluacionTipoPregunta> {
        const body: EvaluacionTipoPreguntaApi = {
            id,
            nombre: payload.nombre,
            codigo: payload.codigo,
            descripcion: payload.descripcion ?? null,
            activo: payload.activo,
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEvaluacionTipoPregunta(id))
        );
    }

    private normalizeEvaluacionTipoPreguntas(
        response: EvaluacionTipoPreguntaApi[] | null | undefined
    ): EvaluacionTipoPregunta[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacionTipoPregunta(item))
            .filter(
                (evaluacionTipoPregunta): evaluacionTipoPregunta is EvaluacionTipoPregunta =>
                    evaluacionTipoPregunta !== null
            );
    }

    private normalizeEvaluacionTipoPregunta(
        raw: EvaluacionTipoPreguntaApi | null | undefined
    ): EvaluacionTipoPregunta | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const nombre = this.coerceOptionalString(raw.nombre ?? raw.Nombre);
        const codigo = this.coerceOptionalString(raw.codigo ?? raw.Codigo);

        if (id === null || !nombre || !codigo) {
            return null;
        }

        return {
            id,
            nombre,
            codigo,
            descripcion: this.coerceOptionalString(raw.descripcion ?? raw.Descripcion),
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

    private normalizeEvaluacionTipoPreguntaOrThrow(
        raw: EvaluacionTipoPreguntaApi | null | undefined
    ): EvaluacionTipoPregunta {
        const evaluacionTipoPregunta = this.normalizeEvaluacionTipoPregunta(raw);

        if (!evaluacionTipoPregunta) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return evaluacionTipoPregunta;
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
