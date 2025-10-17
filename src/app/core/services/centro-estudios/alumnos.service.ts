import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from 'app/core/config/api.config';
import { HttpErrorService } from 'app/core/services/http-error.service';
import {
    Alumno,
    CreateAlumnoPayload,
    UpdateAlumnoPayload,
} from 'app/core/models/centro-estudios/alumno.model';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface AlumnoApi extends Partial<Alumno> {
    Id?: number | string | null;
    Dni?: string | null;
    Apellidos?: string | null;
    Nombres?: string | null;
    FechaNacimiento?: string | null;
    Celular?: string | null;
    Correo?: string | null;
    UbigeoCode?: string | null;
    Direccion?: string | null;
    Observacion?: string | null;
    FotoUrl?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
    ColegioId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class AlumnosService {
    private readonly http = inject(HttpClient);
    private readonly apiConfig = inject(API_CONFIG);
    private readonly errorService = inject(HttpErrorService);

    list(params?: HttpParams): Observable<Alumno[]> {
        return this.http
            .get<AlumnoApi[]>(this.buildUrl(CENTRO_ESTUDIOS_API.alumnos), { params })
            .pipe(
                map((response) => this.normalizeAlumnos(response)),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    get(id: number): Observable<Alumno> {
        return this.http
            .get<AlumnoApi>(`${this.buildUrl(CENTRO_ESTUDIOS_API.alumnos)}/${id}`)
            .pipe(
                map((response) => this.normalizeAlumnoOrThrow(response)),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    create(payload: CreateAlumnoPayload): Observable<Alumno> {
        return this.http
            .post<AlumnoApi>(
                this.buildUrl(CENTRO_ESTUDIOS_API.alumnos),
                this.sanitizeCreatePayload(payload)
            )
            .pipe(
                map((response) => this.normalizeAlumnoOrThrow(response)),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    updatePartial(id: number, payload: UpdateAlumnoPayload): Observable<Alumno> {
        return this.http
            .patch<void>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.alumnos)}/${id}`,
                this.sanitizeUpdatePayload(payload)
            )
            .pipe(
                switchMap(() => this.get(id)),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    remove(id: number): Observable<void> {
        return this.http
            .delete<void>(
                `${this.buildUrl(CENTRO_ESTUDIOS_API.alumnos)}/${id}`
            )
            .pipe(
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    private buildUrl(endpoint: string): string {
        const baseUrl = this.apiConfig.baseUrl.replace(/\/$/, '');
        const sanitizedEndpoint = endpoint.replace(/^\/+/, '');
        return `${baseUrl}/${sanitizedEndpoint}`;
    }

    private sanitizeCreatePayload(payload: CreateAlumnoPayload): CreateAlumnoPayload {
        return {
            dni: this.normalizeIdentifier(payload.dni),
            apellidos: this.normalizeName(payload.apellidos),
            nombres: this.normalizeName(payload.nombres),
            fechaNacimiento: this.normalizeOptionalDate(payload.fechaNacimiento),
            celular: this.normalizeOptionalText(payload.celular),
            correo: this.normalizeOptionalText(payload.correo),
            colegioId: payload.colegioId,
            direccion: this.normalizeOptionalText(payload.direccion),
            observacion: this.normalizeOptionalText(payload.observacion),
            activo: payload.activo,
        };
    }

    private sanitizeUpdatePayload(payload: UpdateAlumnoPayload): UpdateAlumnoPayload {
        const sanitized: UpdateAlumnoPayload = {};

        if (payload.dni !== undefined) {
            sanitized.dni = this.normalizeIdentifier(payload.dni);
        }

        if (payload.apellidos !== undefined) {
            sanitized.apellidos = this.normalizeName(payload.apellidos);
        }

        if (payload.nombres !== undefined) {
            sanitized.nombres = this.normalizeName(payload.nombres);
        }

        if (payload.fechaNacimiento !== undefined) {
            sanitized.fechaNacimiento = this.normalizeOptionalDate(
                payload.fechaNacimiento
            );
        }

        if (payload.celular !== undefined) {
            sanitized.celular = this.normalizeOptionalText(payload.celular);
        }

        if (payload.correo !== undefined) {
            sanitized.correo = this.normalizeOptionalText(payload.correo);
        }

        if (payload.colegioId !== undefined) {
            sanitized.colegioId = payload.colegioId;
        }

        if (payload.direccion !== undefined) {
            sanitized.direccion = this.normalizeOptionalText(payload.direccion);
        }

        if (payload.observacion !== undefined) {
            sanitized.observacion = this.normalizeOptionalText(payload.observacion);
        }

        if (payload.activo !== undefined) {
            sanitized.activo = payload.activo;
        }

        return sanitized;
    }

    private normalizeAlumnos(response: AlumnoApi[] | null | undefined): Alumno[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeAlumno(item))
            .filter((alumno): alumno is Alumno => alumno !== null);
    }

    private normalizeAlumno(raw: AlumnoApi | null | undefined): Alumno | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const dni = this.coerceRequiredString(raw.dni ?? raw.Dni);

        if (id === null || !dni) {
            return null;
        }

        return {
            id,
            dni,
            apellidos: this.coerceOptionalString(raw.apellidos ?? raw.Apellidos),
            nombres: this.coerceOptionalString(raw.nombres ?? raw.Nombres),
            fechaNacimiento: this.coerceOptionalString(
                raw.fechaNacimiento ?? raw.FechaNacimiento
            ),
            celular: this.coerceOptionalString(raw.celular ?? raw.Celular),
            correo: this.coerceOptionalString(raw.correo ?? raw.Correo),
            ubigeoCode: this.coerceOptionalString(raw.ubigeoCode ?? raw.UbigeoCode),
            direccion: this.coerceOptionalString(raw.direccion ?? raw.Direccion),
            observacion: this.coerceOptionalString(raw.observacion ?? raw.Observacion),
            fotoUrl: this.coerceOptionalString(raw.fotoUrl ?? raw.FotoUrl),
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
            colegioId: this.coerceOptionalNumber(raw.colegioId ?? raw.ColegioId),
        };
    }

    private normalizeAlumnoOrThrow(raw: AlumnoApi | null | undefined): Alumno {
        const alumno = this.normalizeAlumno(raw);

        if (!alumno) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return alumno;
    }

    private normalizeIdentifier(value: string): string {
        return value
            .normalize('NFC')
            .replace(/\s+/g, '')
            .trim();
    }

    private normalizeName(value: string): string {
        return value
            .normalize('NFC')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private normalizeOptionalText(value: string | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        const normalized = value
            .normalize('NFC')
            .replace(/\s+/g, ' ')
            .trim();

        return normalized.length > 0 ? normalized : null;
    }

    private normalizeOptionalDate(
        value: string | null | undefined
    ): string | null {
        if (!value) {
            return null;
        }

        const normalized = value.trim();
        return normalized.length > 0 ? normalized : null;
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

    private coerceRequiredString(value: unknown): string | null {
        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized.length > 0 ? normalized : null;
        }

        if (typeof value === 'number') {
            return String(value);
        }

        return null;
    }

    private coerceOptionalString(value: unknown): string | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized.length > 0 ? normalized : null;
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

            return (
                normalized === 'true' ||
                normalized === '1' ||
                normalized === 'si' ||
                normalized === 'sí'
            );
        }

        return defaultValue;
    }
}
