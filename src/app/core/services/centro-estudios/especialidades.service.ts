import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateEspecialidadPayload,
    Especialidad,
    UpdateEspecialidadPayload,
} from 'app/core/models/centro-estudios/especialidad.model';

interface EspecialidadApi extends Partial<Especialidad> {
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
export class EspecialidadesService extends ApiMainService {
    private readonly resourcePath = 'api/Especialidads';

    list(): Observable<Especialidad[]> {
        return this.http
            .get<EspecialidadApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeEspecialidades(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getEspecialidad(id: number): Observable<Especialidad> {
        return this.get<EspecialidadApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEspecialidadOrThrow(response))
        );
    }

    createEspecialidad(payload: CreateEspecialidadPayload): Observable<Especialidad> {
        return this.post<EspecialidadApi>(this.resourcePath, payload).pipe(
            map((response) => this.normalizeEspecialidadOrThrow(response))
        );
    }

    updateEspecialidad(
        id: number,
        payload: UpdateEspecialidadPayload
    ): Observable<Especialidad> {
        const body: UpdateEspecialidadPayload & { id: number } = {
            ...payload,
            id,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEspecialidad(id))
        );
    }

    private normalizeEspecialidades(
        response: EspecialidadApi[] | null | undefined
    ): Especialidad[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEspecialidad(item))
            .filter((especialidad): especialidad is Especialidad => especialidad !== null);
    }

    private normalizeEspecialidad(raw: EspecialidadApi | null | undefined): Especialidad | null {
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

    private normalizeEspecialidadOrThrow(raw: EspecialidadApi | null | undefined): Especialidad {
        const especialidad = this.normalizeEspecialidad(raw);

        if (!especialidad) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return especialidad;
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
