import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, retry, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateMatriculaItemPayload,
    CreateMatriculaPayload,
    CreateMatriculaWithItemsPayload,
    Matricula,
    MatriculaItem,
    MatriculaWithItems,
} from 'app/core/models/centro-estudios/matricula.model';

interface MatriculaApi extends Partial<Matricula> {
    Id?: number | string;
    AlumnoId?: number | string;
    SeccionCicloId?: number | string;
    SedeId?: number | string;
    CicloId?: number | string;
    SeccionId?: number | string;
    CarnetUrl?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
    CarreraId?: number | string | null;
}

interface MatriculaItemApi extends Partial<MatriculaItem> {
    Id?: number | string;
    MatriculaId?: number | string;
    ConceptoId?: number | string;
    Cantidad?: number | string;
    PrecioUnit?: number | string;
    Descuento?: number | string;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class MatriculasService extends ApiMainService {
    private readonly resourcePath = 'api/Matriculas';
    private readonly itemsResourcePath = 'api/MatriculaItems';

    getMatriculasByAlumnoYCiclo(alumnoId: number, cicloId: number): Observable<Matricula[]> {
        const endpoint = `${this.resourcePath}/GetMatriculasByAlumnoCiclo/${alumnoId}/${cicloId}`;

        return this.http
            .get<MatriculaApi[]>(this.buildUrl(endpoint), this.createOptions())
            .pipe(
                retry(this.config.retryAttempts),
                map((response) =>
                    Array.isArray(response)
                        ? response
                              .map((item) => this.normalizeMatricula(item))
                              .filter((item): item is Matricula => item !== null)
                        : []
                ),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getMatriculasBySeccionCiclo(seccionCicloId: number): Observable<Matricula[]> {
        const endpoint = `${this.resourcePath}/GetMatriculasBySeccionCiclo/${seccionCicloId}`;

        return this.http
            .get<MatriculaApi[]>(this.buildUrl(endpoint), this.createOptions())
            .pipe(
                retry(this.config.retryAttempts),
                map((response) =>
                    Array.isArray(response)
                        ? response
                              .map((item) => this.normalizeMatricula(item))
                              .filter((item): item is Matricula => item !== null)
                        : []
                ),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getMatriculasBySedeYCiclo(sedeId: number, cicloId: number): Observable<Matricula[]> {
        const endpoint = `${this.resourcePath}/GetMatriculasBySedeCiclo/${sedeId}/${cicloId}`;

        return this.http
            .get<MatriculaApi[]>(this.buildUrl(endpoint), this.createOptions())
            .pipe(
                retry(this.config.retryAttempts),
                map((response) =>
                    Array.isArray(response)
                        ? response
                              .map((item) => this.normalizeMatricula(item))
                              .filter((item): item is Matricula => item !== null)
                        : []
                ),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    create(payload: CreateMatriculaPayload): Observable<Matricula> {
        const body = this.mapToApiPayload(payload);

        return this.post<MatriculaApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeMatriculaOrThrow(response))
        );
    }

    createWithItems(payload: CreateMatriculaWithItemsPayload): Observable<MatriculaWithItems> {
        const body = this.mapToApiPayload(payload);

        return this.post<MatriculaApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeMatriculaOrThrow(response)),
            switchMap((matricula) =>
                this.createItems(matricula.id, payload.items).pipe(
                    map((items) => ({ matricula, items }))
                )
            )
        );
    }

    private createItems(
        matriculaId: number,
        items: CreateMatriculaItemPayload[]
    ): Observable<MatriculaItem[]> {
        if (items.length === 0) {
            return of([]);
        }

        const requests = items.map((item) => {
            const body: MatriculaItemApi = {
                matriculaId,
                MatriculaId: matriculaId,
                conceptoId: item.conceptoId,
                ConceptoId: item.conceptoId,
                cantidad: item.cantidad,
                Cantidad: item.cantidad,
                precioUnit: item.precioUnit,
                PrecioUnit: item.precioUnit,
                descuento: item.descuento,
                Descuento: item.descuento,
                activo: item.activo ?? true,
                Activo: item.activo ?? true,
            };

            return this.post<MatriculaItemApi>(this.itemsResourcePath, body).pipe(
                map((response) => this.normalizeMatriculaItemOrThrow(response))
            );
        });

        return forkJoin(requests);
    }

    private normalizeMatricula(raw: MatriculaApi | null | undefined): Matricula | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const alumnoId = this.coerceNumber(raw.alumnoId ?? raw.AlumnoId);
        const seccionCicloId = this.coerceNumber(
            raw.seccionCicloId ?? raw.SeccionCicloId
        );
        const sedeId = this.coerceNumber(raw.sedeId ?? raw.SedeId);
        const cicloId = this.coerceNumber(raw.cicloId ?? raw.CicloId);
        const seccionId = this.coerceNumber(raw.seccionId ?? raw.SeccionId);

        if (
            id === null ||
            alumnoId === null ||
            seccionCicloId === null ||
            sedeId === null ||
            cicloId === null ||
            seccionId === null
        ) {
            return null;
        }

        return {
            id,
            alumnoId,
            seccionCicloId,
            sedeId,
            cicloId,
            seccionId,
            carnetUrl: this.coerceOptionalString(raw.carnetUrl ?? raw.CarnetUrl),
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
            carreraId: this.coerceOptionalNumber(raw.carreraId ?? raw.CarreraId),
        };
    }

    private normalizeMatriculaOrThrow(raw: MatriculaApi | null | undefined): Matricula {
        const matricula = this.normalizeMatricula(raw);

        if (!matricula) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return matricula;
    }

    private normalizeMatriculaItem(
        raw: MatriculaItemApi | null | undefined
    ): MatriculaItem | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const matriculaId = this.coerceNumber(raw.matriculaId ?? raw.MatriculaId);
        const conceptoId = this.coerceNumber(raw.conceptoId ?? raw.ConceptoId);
        const cantidad = this.coerceNumber(raw.cantidad ?? raw.Cantidad);
        const precioUnit = this.coerceNumber(raw.precioUnit ?? raw.PrecioUnit);
        const descuento = this.coerceNumber(raw.descuento ?? raw.Descuento);

        if (
            id === null ||
            matriculaId === null ||
            conceptoId === null ||
            cantidad === null ||
            precioUnit === null ||
            descuento === null
        ) {
            return null;
        }

        return {
            id,
            matriculaId,
            conceptoId,
            cantidad,
            precioUnit,
            descuento,
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

    private normalizeMatriculaItemOrThrow(
        raw: MatriculaItemApi | null | undefined
    ): MatriculaItem {
        const item = this.normalizeMatriculaItem(raw);

        if (!item) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return item;
    }

    private mapToApiPayload(payload: CreateMatriculaPayload): MatriculaApi {
        return {
            alumnoId: payload.alumnoId,
            AlumnoId: payload.alumnoId,
            seccionCicloId: payload.seccionCicloId,
            SeccionCicloId: payload.seccionCicloId,
            sedeId: payload.sedeId,
            SedeId: payload.sedeId,
            cicloId: payload.cicloId,
            CicloId: payload.cicloId,
            seccionId: payload.seccionId,
            SeccionId: payload.seccionId,
            carnetUrl: payload.carnetUrl ?? null,
            CarnetUrl: payload.carnetUrl ?? null,
            activo: payload.activo ?? true,
            Activo: payload.activo ?? true,
            carreraId: payload.carreraId ?? null,
            CarreraId: payload.carreraId ?? null,
        };
    }

    private coerceNumber(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const normalized = value.trim();

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
