import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateDocentePayload,
    Docente,
    UpdateDocentePayload,
} from 'app/core/models/centro-estudios/docente.model';

interface DocenteApi extends Partial<Docente> {
    Id?: number | string;
    Dni?: string | null;
    Apellidos?: string | null;
    Nombres?: string | null;
    Celular?: string | null;
    Correo?: string | null;
    EspecialidadId?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class DocentesService extends ApiMainService {
    private readonly resourcePath = 'api/Docentes';

    list(): Observable<Docente[]> {
        return this.http
            .get<DocenteApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeDocentes(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getDocente(id: number): Observable<Docente> {
        return this.get<DocenteApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeDocenteOrThrow(response))
        );
    }

    createDocente(payload: CreateDocentePayload): Observable<Docente> {
        return this.post<DocenteApi>(this.resourcePath, payload).pipe(
            map((response) => this.normalizeDocenteOrThrow(response))
        );
    }

    updateDocente(id: number, payload: UpdateDocentePayload): Observable<Docente> {
        const body: UpdateDocentePayload & { id: number } = {
            ...payload,
            id,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getDocente(id))
        );
    }

    private normalizeDocentes(response: DocenteApi[] | null | undefined): Docente[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeDocente(item))
            .filter((docente): docente is Docente => docente !== null);
    }

    private normalizeDocente(raw: DocenteApi | null | undefined): Docente | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const dni = this.coerceOptionalString(raw.dni ?? raw.Dni);

        if (id === null || !dni) {
            return null;
        }

        return {
            id,
            dni,
            apellidos: this.coerceOptionalString(raw.apellidos ?? raw.Apellidos),
            nombres: this.coerceOptionalString(raw.nombres ?? raw.Nombres),
            celular: this.coerceOptionalString(raw.celular ?? raw.Celular),
            correo: this.coerceOptionalString(raw.correo ?? raw.Correo),
            especialidadId: this.coerceOptionalNumber(
                raw.especialidadId ?? raw.EspecialidadId
            ),
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

    private normalizeDocenteOrThrow(raw: DocenteApi | null | undefined): Docente {
        const docente = this.normalizeDocente(raw);

        if (!docente) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return docente;
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
