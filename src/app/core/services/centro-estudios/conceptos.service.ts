import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    Concepto,
    CreateConceptoPayload,
    UpdateConceptoPayload,
} from 'app/core/models/centro-estudios/concepto.model';

interface ConceptoApi extends Partial<Concepto> {
    Id?: number | string;
    Nombre?: string | null;
    Precio?: number | string | null;
    Impuesto?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
    ConceptoTipoId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class ConceptosService extends ApiMainService {
    private readonly resourcePath = 'api/Conceptoes';

    listAll(): Observable<Concepto[]> {
        return this.http
            .get<ConceptoApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeConceptos(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getConcepto(id: number): Observable<Concepto> {
        return this.get<ConceptoApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeConceptoOrThrow(response))
        );
    }

    createConcepto(payload: CreateConceptoPayload): Observable<Concepto> {
        const body: ConceptoApi = {
            Nombre: payload.nombre,
            Precio: payload.precio,
            Impuesto: payload.impuesto ?? null,
            Activo: payload.activo,
            ConceptoTipoId: payload.conceptoTipoId ?? null,
        };

        return this.post<ConceptoApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeConceptoOrThrow(response))
        );
    }

    updateConcepto(id: number, payload: UpdateConceptoPayload): Observable<Concepto> {
        const body: ConceptoApi = {
            Id: id,
            Nombre: payload.nombre,
            Precio: payload.precio,
            Impuesto: payload.impuesto ?? null,
            Activo: payload.activo,
            ConceptoTipoId: payload.conceptoTipoId ?? null,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getConcepto(id))
        );
    }

    private normalizeConceptos(response: ConceptoApi[] | null | undefined): Concepto[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeConcepto(item))
            .filter((concepto): concepto is Concepto => concepto !== null);
    }

    private normalizeConcepto(raw: ConceptoApi | null | undefined): Concepto | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const nombre = this.coerceOptionalString(raw.nombre ?? raw.Nombre);
        const precio = this.coerceNumber(raw.precio ?? raw.Precio);

        if (id === null || !nombre || precio === null) {
            return null;
        }

        return {
            id,
            nombre,
            precio,
            impuesto: this.coerceOptionalNumber(raw.impuesto ?? raw.Impuesto),
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
            conceptoTipoId: this.coerceOptionalNumber(raw.conceptoTipoId ?? raw.ConceptoTipoId),
        };
    }

    private normalizeConceptoOrThrow(raw: ConceptoApi | null | undefined): Concepto {
        const concepto = this.normalizeConcepto(raw);

        if (!concepto) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return concepto;
    }

    private coerceNumber(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().replace(',', '.');

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

        if (typeof value === 'number' && Number.isFinite(value)) {
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
