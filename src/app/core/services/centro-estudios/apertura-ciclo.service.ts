import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    AperturaCiclo,
    CreateAperturaCicloPayload,
    UpdateAperturaCicloPayload,
} from 'app/core/models/centro-estudios/apertura-ciclo.model';

interface AperturaCicloApi extends Partial<AperturaCiclo> {
    Id?: number | string;
    SedeId?: number | string;
    CicloId?: number | string;
    Observacion?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class AperturaCicloService extends ApiMainService {
    private readonly resourcePath = 'api/AperturaCicloes';

    listByCiclo(cicloId: number): Observable<AperturaCiclo[]> {
        const url = `${this.resourcePath}/ciclo/${cicloId}`;

        return this.http
            .get<AperturaCicloApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeAperturaCiclos(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    create(payload: CreateAperturaCicloPayload): Observable<AperturaCiclo> {
        const body: AperturaCicloApi = {
            sedeId: payload.sedeId,
            SedeId: payload.sedeId,
            cicloId: payload.cicloId,
            CicloId: payload.cicloId,
            observacion: this.normalizeObservacion(payload.observacion),
            Observacion: this.normalizeObservacion(payload.observacion),
            activo: payload.activo,
            Activo: payload.activo,
        };

        return this.post<AperturaCicloApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeAperturaCicloOrThrow(response))
        );
    }

    update(id: number, payload: UpdateAperturaCicloPayload): Observable<AperturaCiclo> {
        const body: AperturaCicloApi = {
            id,
            Id: id,
            sedeId: payload.sedeId,
            SedeId: payload.sedeId,
            cicloId: payload.cicloId,
            CicloId: payload.cicloId,
            observacion: this.normalizeObservacion(payload.observacion),
            Observacion: this.normalizeObservacion(payload.observacion),
            activo: payload.activo,
            Activo: payload.activo,
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getAperturaCiclo(id))
        );
    }

    private getAperturaCiclo(id: number): Observable<AperturaCiclo> {
        return this.get<AperturaCicloApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeAperturaCicloOrThrow(response))
        );
    }

    private normalizeAperturaCiclos(response: AperturaCicloApi[] | null | undefined): AperturaCiclo[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeAperturaCiclo(item))
            .filter((apertura): apertura is AperturaCiclo => apertura !== null);
    }

    private normalizeAperturaCiclo(raw: AperturaCicloApi | null | undefined): AperturaCiclo | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const sedeId = this.coerceNumber(raw.sedeId ?? raw.SedeId);
        const cicloId = this.coerceNumber(raw.cicloId ?? raw.CicloId);

        if (id === null || sedeId === null || cicloId === null) {
            return null;
        }

        return {
            id,
            sedeId,
            cicloId,
            observacion: this.coerceOptionalString(raw.observacion ?? raw.Observacion),
            activo: this.coerceBoolean(raw.activo ?? raw.Activo, false),
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

    private normalizeAperturaCicloOrThrow(raw: AperturaCicloApi | null | undefined): AperturaCiclo {
        const apertura = this.normalizeAperturaCiclo(raw);

        if (!apertura) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return apertura;
    }

    private normalizeObservacion(observacion: string | null): string | null {
        if (observacion === null || observacion === undefined) {
            return null;
        }

        const trimmed = observacion.trim();
        return trimmed.length > 0 ? trimmed : null;
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
