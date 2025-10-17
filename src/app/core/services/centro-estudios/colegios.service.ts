import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import {
    Colegio,
    CreateColegioPayload,
    UpdateColegioPayload,
} from 'app/core/models/centro-estudios/colegio.model';
import { ApiMainService } from '../api/api-main.service';

type ColegioApi = Partial<Colegio> & {
    Id?: number | string;
    Nombre?: string | null;
    UbigeoCode?: string | null;
    EsPrivado?: boolean | string | number | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
};

@Injectable({ providedIn: 'root' })
export class ColegiosService extends ApiMainService {
    private readonly resourcePath = 'api/Colegios';
    private readonly unexpectedFormatErrorMessage = 'La respuesta del servidor no tiene el formato esperado.';

    list(): Observable<Colegio[]> {
        return this.getColegios();
    }

    getColegios(): Observable<Colegio[]> {
        return this.fetchColegios();
    }

    createColegio(payload: CreateColegioPayload): Observable<Colegio> {
        return this.post<ColegioApi>(this.resourcePath, payload).pipe(
            map((response) => this.normalizeColegioOrThrow(response))
        );
    }

    getColegioById(id: number): Observable<Colegio> {
        return this.get<ColegioApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeColegioOrThrow(response))
        );
    }

    updateColegio(id: number, payload: UpdateColegioPayload): Observable<Colegio | null> {
        const body: UpdateColegioPayload = {
            ...payload,
            id,
        };

        return this.patch<ColegioApi | null>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap((response) => {
                const colegio = this.normalizeColegio(response ?? undefined);

                if (colegio) {
                    return of(colegio);
                }

                return this.getColegioById(id);
            }),
            catchError((error) => {
                const message = this.resolveErrorMessage(error);

                if (message === this.unexpectedFormatErrorMessage) {
                    return of(null);
                }

                return throwError(() => error);
            })
        );
    }

    private resolveErrorMessage(error: unknown): string | null {
        if (error instanceof Error) {
            return error.message ?? null;
        }

        if (typeof error === 'object' && error !== null && 'message' in error) {
            const potentialMessage = (error as { message?: unknown }).message;

            if (typeof potentialMessage === 'string') {
                return potentialMessage;
            }
        }

        return null;
    }

    private fetchColegios(): Observable<Colegio[]> {
        return this.get<ColegioApi[]>(this.resourcePath).pipe(
            map((response) => this.normalizeColegios(response))
        );
    }

    private normalizeColegios(response: ColegioApi[] | null | undefined): Colegio[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeColegio(item))
            .filter((colegio): colegio is Colegio => colegio !== null);
    }

    private normalizeColegio(raw: ColegioApi | null | undefined): Colegio | null {
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
            ubigeoCode: this.coerceOptionalString(raw.ubigeoCode ?? raw.UbigeoCode),
            esPrivado: this.coerceOptionalBoolean(raw.esPrivado ?? raw.EsPrivado),
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

    private normalizeColegioOrThrow(raw: ColegioApi | null | undefined): Colegio {
        const colegio = this.normalizeColegio(raw);

        if (!colegio) {
            throw new Error(this.unexpectedFormatErrorMessage);
        }

        return colegio;
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

        if (typeof value === 'number') {
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

    private coerceOptionalBoolean(value: unknown): boolean | null {
        if (value === null || value === undefined) {
            return null;
        }

        return this.coerceBoolean(value);
    }
}
