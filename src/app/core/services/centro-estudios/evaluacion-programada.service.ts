import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateEvaluacionProgramadaPayload,
    EvaluacionProgramada,
    UpdateEvaluacionProgramadaPayload,
} from 'app/core/models/centro-estudios/evaluacion-programada.model';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface EvaluacionProgramadaApi extends Partial<EvaluacionProgramada> {
    Id?: number | string;
    SedeId?: number | string;
    CicloId?: number | string | null;
    TipoEvaluacionId?: number | string;
    Nombre?: string | null;
    FechaInicio?: string | null;
    HoraInicio?: string | null;
    HoraFin?: string | null;
    CarreraId?: number | string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

interface EvaluacionProgramadaRequestBody {
    camel: EvaluacionProgramadaApi;
    pascal: EvaluacionProgramadaApi;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionProgramadaService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionProgramadas;

    listAll(): Observable<EvaluacionProgramada[]> {
        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listByFechaInicio(fechaInicio: string): Observable<EvaluacionProgramada[]> {
        const url = `${this.resourcePath}/fechaInicio/${encodeURIComponent(fechaInicio)}`;

        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluaciones(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getById(id: number): Observable<EvaluacionProgramada> {
        return this.get<EvaluacionProgramadaApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionOrThrow(response))
        );
    }

    create(payload: CreateEvaluacionProgramadaPayload): Observable<EvaluacionProgramada> {
        const body = this.buildCreateRequestBody(payload);

        return this.post<EvaluacionProgramadaApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionOrThrow(response))
        );
    }

    update(id: number, payload: UpdateEvaluacionProgramadaPayload): Observable<EvaluacionProgramada> {
        const body = this.buildUpdateRequestBody(id, payload);

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getById(id))
        );
    }

    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(this.buildUrl(`${this.resourcePath}/${id}`), this.createOptions())
            .pipe(catchError((error) => this.handleError(error)));
    }

    private buildCreateRequestBody(
        payload: CreateEvaluacionProgramadaPayload | UpdateEvaluacionProgramadaPayload
    ): { evaluacionProgramadum: EvaluacionProgramadaApi; EvaluacionProgramadum: EvaluacionProgramadaApi } {
        const entity = this.buildRequestEntity(payload);

        return {
            evaluacionProgramadum: entity.camel,
            EvaluacionProgramadum: entity.pascal,
        };
    }

    private buildUpdateRequestBody(
        id: number,
        payload: CreateEvaluacionProgramadaPayload | UpdateEvaluacionProgramadaPayload
    ): {
        id: number;
        Id: number;
        evaluacionProgramadum: EvaluacionProgramadaApi;
        EvaluacionProgramadum: EvaluacionProgramadaApi;
    } {
        const entity = this.buildRequestEntity(payload);

        const camel: EvaluacionProgramadaApi = {
            ...entity.camel,
            id,
            Id: id,
        };

        const pascal: EvaluacionProgramadaApi = {
            ...entity.pascal,
            Id: id,
        };

        return {
            id,
            Id: id,
            evaluacionProgramadum: camel,
            EvaluacionProgramadum: pascal,
        };
    }

    private buildRequestEntity(
        payload: CreateEvaluacionProgramadaPayload | UpdateEvaluacionProgramadaPayload
    ): EvaluacionProgramadaRequestBody {
        const camel: EvaluacionProgramadaApi = {};
        const pascal: EvaluacionProgramadaApi = {};

        if (payload.sedeId !== undefined) {
            camel.sedeId = payload.sedeId;
            pascal.SedeId = payload.sedeId;
        }

        if (payload.cicloId !== undefined) {
            camel.cicloId = payload.cicloId;
            pascal.CicloId = payload.cicloId;
        }

        if (payload.tipoEvaluacionId !== undefined) {
            camel.tipoEvaluacionId = payload.tipoEvaluacionId;
            pascal.TipoEvaluacionId = payload.tipoEvaluacionId;
        }

        if (payload.nombre !== undefined) {
            const nombre = payload.nombre.trim();
            camel.nombre = nombre;
            pascal.Nombre = nombre;
        }

        if (payload.fechaInicio !== undefined) {
            camel.fechaInicio = payload.fechaInicio;
            pascal.FechaInicio = payload.fechaInicio;
        }

        if (payload.horaInicio !== undefined) {
            camel.horaInicio = payload.horaInicio;
            pascal.HoraInicio = payload.horaInicio;
        }

        if (payload.horaFin !== undefined) {
            camel.horaFin = payload.horaFin;
            pascal.HoraFin = payload.horaFin;
        }

        if (payload.carreraId !== undefined) {
            camel.carreraId = payload.carreraId;
            pascal.CarreraId = payload.carreraId;
        }

        if (payload.activo !== undefined) {
            camel.activo = payload.activo;
            pascal.Activo = payload.activo;
        }

        return { camel, pascal };
    }

    private normalizeEvaluaciones(
        response: EvaluacionProgramadaApi[] | null | undefined
    ): EvaluacionProgramada[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacion(item))
            .filter((evaluacion): evaluacion is EvaluacionProgramada => evaluacion !== null);
    }

    private normalizeEvaluacion(
        raw: EvaluacionProgramadaApi | null | undefined
    ): EvaluacionProgramada | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const sedeId = this.coerceNumber(raw.sedeId ?? raw.SedeId);
        const tipoEvaluacionId = this.coerceNumber(raw.tipoEvaluacionId ?? raw.TipoEvaluacionId);
        const nombre = this.coerceOptionalString(raw.nombre ?? raw.Nombre);
        const fechaInicio = this.coerceOptionalString(raw.fechaInicio ?? raw.FechaInicio);
        const horaInicio = this.coerceOptionalString(raw.horaInicio ?? raw.HoraInicio);
        const horaFin = this.coerceOptionalString(raw.horaFin ?? raw.HoraFin);

        if (
            id === null ||
            sedeId === null ||
            tipoEvaluacionId === null ||
            !nombre ||
            !fechaInicio ||
            !horaInicio ||
            !horaFin
        ) {
            return null;
        }

        return {
            id,
            sedeId,
            cicloId: this.coerceOptionalNumber(raw.cicloId ?? raw.CicloId),
            tipoEvaluacionId,
            nombre,
            fechaInicio,
            horaInicio,
            horaFin,
            carreraId: this.coerceOptionalNumber(raw.carreraId ?? raw.CarreraId),
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

    private normalizeEvaluacionOrThrow(
        raw: EvaluacionProgramadaApi | null | undefined
    ): EvaluacionProgramada {
        const evaluacion = this.normalizeEvaluacion(raw);

        if (!evaluacion) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return evaluacion;
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
