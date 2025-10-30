import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';
import { EstadoEvaluacionProgramada } from 'app/core/models/centro-estudios/estado-evaluacion-programada.model';

interface EstadoEvaluacionProgramadaApi extends Partial<EstadoEvaluacionProgramada> {
    Id?: number | string;
    Nombre?: string;
    Codigo?: string;
    Orden?: number | string;
    Descripcion?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class EstadoEvaluacionProgramadaService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.estadoEvaluacionProgramadas;

    listAll(): Observable<EstadoEvaluacionProgramada[]> {
        return this.http
            .get<EstadoEvaluacionProgramadaApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeEstados(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    private normalizeEstados(
        response: EstadoEvaluacionProgramadaApi[] | null | undefined
    ): EstadoEvaluacionProgramada[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEstado(item))
            .filter((estado): estado is EstadoEvaluacionProgramada => estado !== null);
    }

    private normalizeEstado(
        raw: EstadoEvaluacionProgramadaApi | null | undefined
    ): EstadoEvaluacionProgramada | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const nombre = this.coerceOptionalString(raw.nombre ?? raw.Nombre);
        const codigo = this.coerceOptionalString(raw.codigo ?? raw.Codigo);
        const orden = this.coerceNumber(raw.orden ?? raw.Orden);

        if (id === null || !nombre || !codigo || orden === null) {
            return null;
        }

        return {
            id,
            nombre,
            codigo,
            orden,
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
