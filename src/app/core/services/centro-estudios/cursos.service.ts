import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    Curso,
    CreateCursoPayload,
    UpdateCursoPayload,
} from 'app/core/models/centro-estudios/curso.model';

interface CursoApi extends Partial<Curso> {
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
export class CursosService extends ApiMainService {
    private readonly resourcePath = 'api/Cursoes';

    list(): Observable<Curso[]> {
        return this.http
            .get<CursoApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeCursos(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getCurso(id: number): Observable<Curso> {
        return this.get<CursoApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeCursoOrThrow(response))
        );
    }

    createCurso(payload: CreateCursoPayload): Observable<Curso> {
        return this.post<CursoApi>(this.resourcePath, payload).pipe(
            map((response) => this.normalizeCursoOrThrow(response))
        );
    }

    updateCurso(id: number, payload: UpdateCursoPayload): Observable<Curso> {
        const body: UpdateCursoPayload & { id: number } = {
            ...payload,
            id,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getCurso(id))
        );
    }

    private normalizeCursos(response: CursoApi[] | null | undefined): Curso[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeCurso(item))
            .filter((curso): curso is Curso => curso !== null);
    }

    private normalizeCurso(raw: CursoApi | null | undefined): Curso | null {
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

    private normalizeCursoOrThrow(raw: CursoApi | null | undefined): Curso {
        const curso = this.normalizeCurso(raw);

        if (!curso) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return curso;
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
