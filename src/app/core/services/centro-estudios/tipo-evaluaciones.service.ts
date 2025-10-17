import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateTipoEvaluacionPayload,
    TipoEvaluacion,
    UpdateTipoEvaluacionPayload,
} from 'app/core/models/centro-estudios/tipo-evaluacion.model';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface TipoEvaluacionApi extends Partial<TipoEvaluacion> {
    Id?: number | string;
    Nombre?: string | null;
    Descripcion?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class TipoEvaluacionesService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.tipoEvaluaciones;

    listAll(): Observable<TipoEvaluacion[]> {
        return this.http
            .get<TipoEvaluacionApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeTiposEvaluacion(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getTipoEvaluacion(id: number): Observable<TipoEvaluacion> {
        return this.get<TipoEvaluacionApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeTipoEvaluacionOrThrow(response))
        );
    }

    createTipoEvaluacion(payload: CreateTipoEvaluacionPayload): Observable<TipoEvaluacion> {
        const body: TipoEvaluacionApi = {
            nombre: payload.nombre,
            descripcion: payload.descripcion ?? null,
            activo: payload.activo,
        };

        return this.post<TipoEvaluacionApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeTipoEvaluacionOrThrow(response))
        );
    }

    updateTipoEvaluacion(
        id: number,
        payload: UpdateTipoEvaluacionPayload
    ): Observable<TipoEvaluacion> {
        const body: TipoEvaluacionApi = {
            id,
            nombre: payload.nombre,
            descripcion: payload.descripcion ?? null,
            activo: payload.activo,
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getTipoEvaluacion(id))
        );
    }

    private normalizeTiposEvaluacion(
        response: TipoEvaluacionApi[] | null | undefined
    ): TipoEvaluacion[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeTipoEvaluacion(item))
            .filter((tipoEvaluacion): tipoEvaluacion is TipoEvaluacion => tipoEvaluacion !== null);
    }

    private normalizeTipoEvaluacion(raw: TipoEvaluacionApi | null | undefined): TipoEvaluacion | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const nombre = this.coerceOptionalString(raw.nombre ?? raw.Nombre);

        if (id === null || !nombre) {
            return null;
        }

        return {
            id,
            nombre,
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

    private normalizeTipoEvaluacionOrThrow(
        raw: TipoEvaluacionApi | null | undefined
    ): TipoEvaluacion {
        const tipoEvaluacion = this.normalizeTipoEvaluacion(raw);

        if (!tipoEvaluacion) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return tipoEvaluacion;
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
