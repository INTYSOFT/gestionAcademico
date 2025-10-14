import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    Ciclo,
    CreateCicloPayload,
    UpdateCicloPayload,
} from 'app/core/models/centro-estudios/ciclo.model';

interface CicloApi extends Partial<Ciclo> {
    Id?: number | string;
    Nombre?: string | null;
    FechaInicio?: string | null;
    FechaFin?: string | null;
    CapacidadTotal?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class CiclosService extends ApiMainService {
    private readonly resourcePath = 'api/Cicloes';

    listAll(): Observable<Ciclo[]> {
        return this.http
            .get<CicloApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeCiclos(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listBySede(_sedeId: number): Observable<Ciclo[]> {
        return this.listAll();
    }

    getCiclo(id: number): Observable<Ciclo> {
        return this.get<CicloApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeCicloOrThrow(response))
        );
    }

    createCiclo(payload: CreateCicloPayload): Observable<Ciclo> {
        return this.post<CicloApi>(this.resourcePath, payload).pipe(
            map((response) => this.normalizeCicloOrThrow(response))
        );
    }

    updateCiclo(id: number, payload: UpdateCicloPayload): Observable<Ciclo> {
        const body: CicloApi = { id };

        if (payload.nombre !== undefined) {
            body.nombre = payload.nombre;
        }

        if (payload.fechaInicio !== undefined) {
            body.fechaInicio = payload.fechaInicio ?? null;
        }

        if (payload.fechaFin !== undefined) {
            body.fechaFin = payload.fechaFin ?? null;
        }

        if (payload.capacidadTotal !== undefined) {
            body.capacidadTotal = payload.capacidadTotal ?? null;
        }

        if (payload.activo !== undefined) {
            body.activo = payload.activo;
        }

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getCiclo(id))
        );
    }

    private normalizeCiclos(response: CicloApi[] | null | undefined): Ciclo[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeCiclo(item))
            .filter((ciclo): ciclo is Ciclo => ciclo !== null);
    }

    private normalizeCiclo(raw: CicloApi | null | undefined): Ciclo | null {
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
            fechaInicio: this.coerceOptionalString(raw.fechaInicio ?? raw.FechaInicio),
            fechaFin: this.coerceOptionalString(raw.fechaFin ?? raw.FechaFin),
            capacidadTotal: this.coerceOptionalNumber(
                raw.capacidadTotal ?? raw.CapacidadTotal
            ),
            activo: this.coerceBoolean(raw.activo ?? raw.Activo, true),
            fechaRegistro: this.coerceOptionalString(
                raw.fechaRegistro ?? raw.FechaRegistro
            ),
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

    private normalizeCicloOrThrow(raw: CicloApi | null | undefined): Ciclo {
        const ciclo = this.normalizeCiclo(raw);

        if (!ciclo) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return ciclo;
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
