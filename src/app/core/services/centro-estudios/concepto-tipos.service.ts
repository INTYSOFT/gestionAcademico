import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    ConceptoTipo,
    CreateConceptoTipoPayload,
    UpdateConceptoTipoPayload,
} from 'app/core/models/centro-estudios/concepto-tipo.model';

interface ConceptoTipoApi extends Partial<ConceptoTipo> {
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
export class ConceptoTiposService extends ApiMainService {
    private readonly resourcePath = 'api/ConceptoTipoes';

    listAll(): Observable<ConceptoTipo[]> {
        return this.http
            .get<ConceptoTipoApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeConceptoTipos(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getConceptoTipo(id: number): Observable<ConceptoTipo> {
        return this.get<ConceptoTipoApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeConceptoTipoOrThrow(response))
        );
    }

    createConceptoTipo(payload: CreateConceptoTipoPayload): Observable<ConceptoTipo> {
        const body: ConceptoTipoApi = {
            nombre: payload.nombre,
            descripcion: payload.descripcion ?? null,
            activo: payload.activo,
        };

        return this.post<ConceptoTipoApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeConceptoTipoOrThrow(response))
        );
    }

    updateConceptoTipo(
        id: number,
        payload: UpdateConceptoTipoPayload
    ): Observable<ConceptoTipo> {
        const body: ConceptoTipoApi = {
            id,
            nombre: payload.nombre,
            descripcion: payload.descripcion ?? null,
            activo: payload.activo,
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getConceptoTipo(id))
        );
    }

    private normalizeConceptoTipos(
        response: ConceptoTipoApi[] | null | undefined
    ): ConceptoTipo[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeConceptoTipo(item))
            .filter((conceptoTipo): conceptoTipo is ConceptoTipo => conceptoTipo !== null);
    }

    private normalizeConceptoTipo(raw: ConceptoTipoApi | null | undefined): ConceptoTipo | null {
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

    private normalizeConceptoTipoOrThrow(raw: ConceptoTipoApi | null | undefined): ConceptoTipo {
        const conceptoTipo = this.normalizeConceptoTipo(raw);

        if (!conceptoTipo) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return conceptoTipo;
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
