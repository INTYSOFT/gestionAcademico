import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateEvaluacionDetallePayload,
    EvaluacionDetalle,
    UpdateEvaluacionDetallePayload,
} from 'app/core/models/centro-estudios/evaluacion-detalle.model';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface EvaluacionDetalleApi extends Partial<EvaluacionDetalle> {
    Id?: number | string;
    EvaluacionProgramadaId?: number | string;
    SeccionId?: number | string | null;
    RangoInicio?: number | string;
    RangoFin?: number | string;
    ValorBuena?: number | string;
    ValorMala?: number | string;
    ValorBlanca?: number | string;
    Observacion?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
}

export function parseEvaluacionDetalleNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();

        if (!trimmed) {
            return null;
        }

        let sanitized = trimmed
            .replace(/\u00a0/g, '')
            .replace(/\s+/g, '');

        const lastCommaIndex = sanitized.lastIndexOf(',');
        const lastDotIndex = sanitized.lastIndexOf('.');

        if (lastCommaIndex > -1 && lastDotIndex > -1) {
            if (lastCommaIndex > lastDotIndex) {
                sanitized = sanitized.replace(/\./g, '').replace(',', '.');
            } else {
                sanitized = sanitized.replace(/,/g, '');
            }
        } else if (lastCommaIndex > -1) {
            sanitized = sanitized.replace(/,/g, '.');
        }

        const parsed = Number(sanitized);

        return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionDetallesService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionDetalles;

    listByEvaluacionProgramada(
        evaluacionProgramadaId: number
    ): Observable<EvaluacionDetalle[]> {
        const params = new HttpParams().set(
            'evaluacionProgramadaId',
            evaluacionProgramadaId
        );

        return this.http
            .get<EvaluacionDetalleApi[]>(
                this.buildUrl(this.resourcePath),
                this.createOptions({ params })
            )
            .pipe(
                map((response) =>
                    this.normalizeEvaluacionDetalles(response).filter(
                        (detalle) => detalle.evaluacionProgramadaId === evaluacionProgramadaId
                    )
                ),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    create(payload: CreateEvaluacionDetallePayload): Observable<EvaluacionDetalle> {
        const body = this.mapPayloadToApi(payload);

        return this.post<EvaluacionDetalleApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionDetalleOrThrow(response))
        );
    }

    update(
        id: number,
        payload: UpdateEvaluacionDetallePayload
    ): Observable<EvaluacionDetalle> {
        const body: EvaluacionDetalleApi = {
            id,
            Id: id,
            ...this.mapPayloadToApi(payload),
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEvaluacionDetalle(id))
        );
    }

    delete(id: number): Observable<void> {
        return this.http
            .delete<void>(
                this.buildUrl(`${this.resourcePath}/${id}`),
                this.createOptions()
            )
            .pipe(catchError((error) => this.handleError(error)));
    }

    private getEvaluacionDetalle(id: number): Observable<EvaluacionDetalle> {
        return this.get<EvaluacionDetalleApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionDetalleOrThrow(response))
        );
    }

    private mapPayloadToApi(
        payload: CreateEvaluacionDetallePayload | UpdateEvaluacionDetallePayload
    ): EvaluacionDetalleApi {
        const normalized: EvaluacionDetalleApi = {};

        if (payload.evaluacionProgramadaId !== undefined) {
            normalized.evaluacionProgramadaId = payload.evaluacionProgramadaId;
            normalized.EvaluacionProgramadaId = payload.evaluacionProgramadaId;
        }

        if (payload.seccionId !== undefined) {
            normalized.seccionId = payload.seccionId;
            normalized.SeccionId = payload.seccionId;
        }

        if (payload.rangoInicio !== undefined) {
            normalized.rangoInicio = payload.rangoInicio;
            normalized.RangoInicio = payload.rangoInicio;
        }

        if (payload.rangoFin !== undefined) {
            normalized.rangoFin = payload.rangoFin;
            normalized.RangoFin = payload.rangoFin;
        }

        if (payload.valorBuena !== undefined) {
            normalized.valorBuena = payload.valorBuena;
            normalized.ValorBuena = payload.valorBuena;
        }

        if (payload.valorMala !== undefined) {
            normalized.valorMala = payload.valorMala;
            normalized.ValorMala = payload.valorMala;
        }

        if (payload.valorBlanca !== undefined) {
            normalized.valorBlanca = payload.valorBlanca;
            normalized.ValorBlanca = payload.valorBlanca;
        }

        if (payload.observacion !== undefined) {
            normalized.observacion = payload.observacion;
            normalized.Observacion = payload.observacion;
        }

        if (payload.activo !== undefined) {
            normalized.activo = payload.activo;
            normalized.Activo = payload.activo;
        }

        return normalized;
    }

    private normalizeEvaluacionDetalles(
        response: EvaluacionDetalleApi[] | null | undefined
    ): EvaluacionDetalle[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacionDetalle(item))
            .filter((detalle): detalle is EvaluacionDetalle => detalle !== null);
    }

    private normalizeEvaluacionDetalle(
        raw: EvaluacionDetalleApi | null | undefined
    ): EvaluacionDetalle | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const evaluacionProgramadaId = this.coerceNumber(
            raw.evaluacionProgramadaId ?? raw.EvaluacionProgramadaId
        );
        const rangoInicio = this.coerceNumber(raw.rangoInicio ?? raw.RangoInicio);
        const rangoFin = this.coerceNumber(raw.rangoFin ?? raw.RangoFin);
        const valorBuena = this.coerceNumber(raw.valorBuena ?? raw.ValorBuena);
        const valorMala = this.coerceNumber(raw.valorMala ?? raw.ValorMala);
        const valorBlanca = this.coerceNumber(raw.valorBlanca ?? raw.ValorBlanca);

        if (
            id === null ||
            evaluacionProgramadaId === null ||
            rangoInicio === null ||
            rangoFin === null ||
            valorBuena === null ||
            valorMala === null ||
            valorBlanca === null
        ) {
            return null;
        }

        return {
            id,
            evaluacionProgramadaId,
            seccionId: this.coerceOptionalNumber(raw.seccionId ?? raw.SeccionId),
            rangoInicio,
            rangoFin,
            valorBuena,
            valorMala,
            valorBlanca,
            observacion: this.coerceOptionalString(raw.observacion ?? raw.Observacion),
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

    private normalizeEvaluacionDetalleOrThrow(
        raw: EvaluacionDetalleApi | null | undefined
    ): EvaluacionDetalle {
        const detalle = this.normalizeEvaluacionDetalle(raw);

        if (!detalle) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return detalle;
    }

    private coerceNumber(value: unknown): number | null {
        return parseEvaluacionDetalleNumber(value);
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
