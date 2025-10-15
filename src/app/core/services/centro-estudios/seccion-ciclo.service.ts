import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateSeccionCicloPayload,
    SeccionCiclo,
    UpdateSeccionCicloPayload,
} from 'app/core/models/centro-estudios/seccion-ciclo.model';

interface SeccionCicloApi extends Partial<SeccionCiclo> {
    Id?: number | string;
    CicloId?: number | string;
    SeccionId?: number | string;
    NivelId?: number | string;
    SedeId?: number | string;
    Capacidad?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class SeccionCicloService extends ApiMainService {
    private readonly resourcePath = 'api/SeccionCicloes';

    listByCiclo(cicloId: number): Observable<SeccionCiclo[]> {
        const url = `${this.resourcePath}/ciclo/${cicloId}`;

        return this.http
            .get<SeccionCicloApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeSeccionCiclos(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    create(payload: CreateSeccionCicloPayload): Observable<SeccionCiclo> {
        return this.post<SeccionCicloApi>(this.resourcePath, payload).pipe(
            map((response) => this.normalizeSeccionCicloOrThrow(response))
        );
    }

    update(id: number, payload: UpdateSeccionCicloPayload): Observable<SeccionCiclo> {
        const body: UpdateSeccionCicloPayload & { id: number } = {
            ...payload,
            id,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getSeccionCiclo(id))
        );
    }

    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(this.buildUrl(`${this.resourcePath}/${id}`), this.createOptions())
            .pipe(catchError((error) => this.handleError(error)));
    }

    private getSeccionCiclo(id: number): Observable<SeccionCiclo> {
        return this.get<SeccionCicloApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeSeccionCicloOrThrow(response))
        );
    }

    private normalizeSeccionCiclos(response: SeccionCicloApi[] | null | undefined): SeccionCiclo[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeSeccionCiclo(item))
            .filter((seccionCiclo): seccionCiclo is SeccionCiclo => seccionCiclo !== null);
    }

    private normalizeSeccionCiclo(raw: SeccionCicloApi | null | undefined): SeccionCiclo | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const cicloId = this.coerceNumber(raw.cicloId ?? raw.CicloId);
        const seccionId = this.coerceNumber(raw.seccionId ?? raw.SeccionId);
        const nivelId = this.coerceNumber(raw.nivelId ?? raw.NivelId);
        const sedeId = this.coerceNumber(raw.sedeId ?? raw.SedeId);

        if (
            id === null ||
            cicloId === null ||
            seccionId === null ||
            nivelId === null ||
            sedeId === null
        ) {
            return null;
        }

        return {
            id,
            cicloId,
            seccionId,
            nivelId,
            sedeId,
            capacidad: this.coerceOptionalNumber(raw.capacidad ?? raw.Capacidad) ?? 0,
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

    private normalizeSeccionCicloOrThrow(raw: SeccionCicloApi | null | undefined): SeccionCiclo {
        const seccionCiclo = this.normalizeSeccionCiclo(raw);

        if (!seccionCiclo) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return seccionCiclo;
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
