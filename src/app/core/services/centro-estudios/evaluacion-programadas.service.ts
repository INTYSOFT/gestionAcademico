import { HttpErrorResponse, HttpParams } from '@angular/common/http';
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
    EstadoId?: number | string | null;
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

@Injectable({ providedIn: 'root' })
export class EvaluacionProgramadasService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionProgramadas;

    listAll(): Observable<EvaluacionProgramada[]> {
        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(this.resourcePath), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionProgramadas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listByFechaInicio(fechaInicio: string): Observable<EvaluacionProgramada[]> {
        const url = `${this.resourcePath}/fechaInicio/${fechaInicio}`;

        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionProgramadas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listByFechaYCiclo(fechaInicio: string, cicloId: number): Observable<EvaluacionProgramada[]> {
        const url = `${this.resourcePath}/fechaInicio/${fechaInicio}/ciclo/${cicloId}`;

        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionProgramadas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listByFechaSedeYCiclo(
        fechaInicio: string,
        sedeId: number,
        cicloId: number
    ): Observable<EvaluacionProgramada[]> {
        const url = `${this.resourcePath}/fechaInicio/${fechaInicio}/sede/${sedeId}/ciclo/${cicloId}`;

        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionProgramadas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listByFechaInicioRange(
        fechaInicioDesde: string,
        fechaInicioHasta: string
    ): Observable<EvaluacionProgramada[]> {
        const url = `${this.resourcePath}/fechaInicio/rango`;
        const params = new HttpParams()
            .set('fechaInicioDesde', fechaInicioDesde)
            .set('fechaInicioHasta', fechaInicioHasta);

        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(url), this.createOptions({ params }))
            .pipe(
                map((response) => this.normalizeEvaluacionProgramadas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    listActivasByAnioMes(anio: number, mes: number): Observable<EvaluacionProgramada[]> {
        const url = `${this.resourcePath}/activo/${anio}/${mes}`;

        return this.http
            .get<EvaluacionProgramadaApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) => this.normalizeEvaluacionProgramadas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    getEvaluacionProgramada(id: number): Observable<EvaluacionProgramada> {
        return this.get<EvaluacionProgramadaApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionProgramadaOrThrow(response))
        );
    }

    create(payload: CreateEvaluacionProgramadaPayload): Observable<EvaluacionProgramada> {
        const body: EvaluacionProgramadaApi = this.mapPayloadToApi(payload);

        return this.post<EvaluacionProgramadaApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionProgramadaOrThrow(response))
        );
    }

    update(id: number, payload: UpdateEvaluacionProgramadaPayload): Observable<EvaluacionProgramada> {
        const body: EvaluacionProgramadaApi = {
            id,
            Id: id,
            ...this.mapPayloadToApi(payload),
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEvaluacionProgramada(id))
        );
    }

    updateEstado(id: number, estadoId: number): Observable<EvaluacionProgramada> {
        const body: EvaluacionProgramadaApi = {
            id,
            Id: id,
            estadoId,
            EstadoId: estadoId,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEvaluacionProgramada(id))
        );
    }

    private mapPayloadToApi(
        payload: CreateEvaluacionProgramadaPayload | UpdateEvaluacionProgramadaPayload
    ): EvaluacionProgramadaApi {
        const normalized: EvaluacionProgramadaApi = {};

        if (payload.sedeId !== undefined) {
            normalized.sedeId = payload.sedeId;
            normalized.SedeId = payload.sedeId;
        }

        if (payload.cicloId !== undefined) {
            normalized.cicloId = payload.cicloId;
            normalized.CicloId = payload.cicloId;
        }

        if (payload.estadoId !== undefined) {
            normalized.estadoId = payload.estadoId;
            normalized.EstadoId = payload.estadoId;
        }

        if (payload.tipoEvaluacionId !== undefined) {
            normalized.tipoEvaluacionId = payload.tipoEvaluacionId;
            normalized.TipoEvaluacionId = payload.tipoEvaluacionId;
        }

        if (payload.nombre !== undefined) {
            const nombre = payload.nombre.trim();
            normalized.nombre = nombre;
            normalized.Nombre = nombre;
        }

        if (payload.fechaInicio !== undefined) {
            normalized.fechaInicio = payload.fechaInicio;
            normalized.FechaInicio = payload.fechaInicio;
        }

        if (payload.horaInicio !== undefined) {
            normalized.horaInicio = payload.horaInicio;
            normalized.HoraInicio = payload.horaInicio;
        }

        if (payload.horaFin !== undefined) {
            normalized.horaFin = payload.horaFin;
            normalized.HoraFin = payload.horaFin;
        }

        if (payload.carreraId !== undefined) {
            normalized.carreraId = payload.carreraId;
            normalized.CarreraId = payload.carreraId;
        }

        if (payload.activo !== undefined) {
            normalized.activo = payload.activo;
            normalized.Activo = payload.activo;
        }

        return normalized;
    }

    private normalizeEvaluacionProgramadas(
        response: EvaluacionProgramadaApi[] | null | undefined
    ): EvaluacionProgramada[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacionProgramada(item))
            .filter(
                (evaluacion): evaluacion is EvaluacionProgramada => evaluacion !== null
            );
    }

    private normalizeEvaluacionProgramada(
        raw: EvaluacionProgramadaApi | null | undefined
    ): EvaluacionProgramada | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const sedeId = this.coerceNumber(raw.sedeId ?? raw.SedeId);
        const tipoEvaluacionId = this.coerceNumber(
            raw.tipoEvaluacionId ?? raw.TipoEvaluacionId
        );
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
            estadoId: this.coerceOptionalNumber(raw.estadoId ?? raw.EstadoId),
            tipoEvaluacionId,
            nombre,
            fechaInicio,
            horaInicio,
            horaFin,
            carreraId: this.coerceOptionalNumber(raw.carreraId ?? raw.CarreraId),
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

    private normalizeEvaluacionProgramadaOrThrow(
        raw: EvaluacionProgramadaApi | null | undefined
    ): EvaluacionProgramada {
        const evaluacion = this.normalizeEvaluacionProgramada(raw);

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
