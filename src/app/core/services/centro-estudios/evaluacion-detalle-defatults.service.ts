import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateEvaluacionDetalleDefatultPayload,
    EvaluacionDetalleDefatult,
    UpdateEvaluacionDetalleDefatultPayload,
} from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

interface EvaluacionDetalleDefatultApi extends Partial<EvaluacionDetalleDefatult> {
    Id?: number | string;
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
    EvaluacionTipoPreguntaId?: number | string;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionDetalleDefatultsService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionDetalleDefatults;

    list(): Observable<EvaluacionDetalleDefatult[]> {
        return this.http
            .get<EvaluacionDetalleDefatultApi[]>(
                this.buildUrl(this.resourcePath),
                this.createOptions()
            )
            .pipe(
                map((response) => this.normalizeEvaluacionDetalleDefatults(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    create(
        payload: CreateEvaluacionDetalleDefatultPayload
    ): Observable<EvaluacionDetalleDefatult> {
        const body = this.mapPayloadToApi(payload);

        return this.post<EvaluacionDetalleDefatultApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionDetalleDefatultOrThrow(response))
        );
    }

    update(
        id: number,
        payload: UpdateEvaluacionDetalleDefatultPayload
    ): Observable<EvaluacionDetalleDefatult> {
        const body: EvaluacionDetalleDefatultApi = {
            id,
            Id: id,
            ...this.mapPayloadToApi(payload),
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.fetchDetalle(id))
        );
    }

    deleteById(id: number): Observable<void> {
        return super.delete<void>(`${this.resourcePath}/${id}`);
    }

    private fetchDetalle(id: number): Observable<EvaluacionDetalleDefatult> {
        return this.get<EvaluacionDetalleDefatultApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionDetalleDefatultOrThrow(response))
        );
    }

    private mapPayloadToApi(
        payload: CreateEvaluacionDetalleDefatultPayload | UpdateEvaluacionDetalleDefatultPayload
    ): EvaluacionDetalleDefatultApi {
        const normalized: EvaluacionDetalleDefatultApi = {};

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
            normalized.observacion = payload.observacion ?? null;
            normalized.Observacion = payload.observacion ?? null;
        }

        if (payload.activo !== undefined) {
            normalized.activo = payload.activo;
            normalized.Activo = payload.activo;
        }

        if (payload.evaluacionTipoPreguntaId !== undefined) {
            normalized.evaluacionTipoPreguntaId = payload.evaluacionTipoPreguntaId;
            normalized.EvaluacionTipoPreguntaId = payload.evaluacionTipoPreguntaId;
        }

        return normalized;
    }

    private normalizeEvaluacionDetalleDefatults(
        response: EvaluacionDetalleDefatultApi[] | null | undefined
    ): EvaluacionDetalleDefatult[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacionDetalleDefatult(item))
            .filter(
                (detalle): detalle is EvaluacionDetalleDefatult => detalle !== null
            );
    }

    private normalizeEvaluacionDetalleDefatult(
        raw: EvaluacionDetalleDefatultApi | null | undefined
    ): EvaluacionDetalleDefatult | null {
        if (!raw) {
            return null;
        }

        const id = this.coerceNumber(raw.id ?? raw.Id);
        const rangoInicio = this.coerceNumber(raw.rangoInicio ?? raw.RangoInicio);
        const rangoFin = this.coerceNumber(raw.rangoFin ?? raw.RangoFin);
        const valorBuena = this.coerceDecimal(raw.valorBuena ?? raw.ValorBuena);
        const valorMala = this.coerceDecimal(raw.valorMala ?? raw.ValorMala);
        const valorBlanca = this.coerceDecimal(raw.valorBlanca ?? raw.ValorBlanca);
        const evaluacionTipoPreguntaId = this.coerceNumber(
            raw.evaluacionTipoPreguntaId ?? raw.EvaluacionTipoPreguntaId
        );

        if (
            id === null ||
            rangoInicio === null ||
            rangoFin === null ||
            valorBuena === null ||
            valorMala === null ||
            valorBlanca === null ||
            evaluacionTipoPreguntaId === null
        ) {
            return null;
        }

        return {
            id,
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
            evaluacionTipoPreguntaId,
        };
    }

    private normalizeEvaluacionDetalleDefatultOrThrow(
        raw: EvaluacionDetalleDefatultApi | null | undefined
    ): EvaluacionDetalleDefatult {
        const detalle = this.normalizeEvaluacionDetalleDefatult(raw);

        if (!detalle) {
            throw new Error('La respuesta del servidor no tiene el formato esperado.');
        }

        return detalle;
    }

    private coerceNumber(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();

            if (!trimmed) {
                return null;
            }

            const parsed = Number(trimmed);
            return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
    }

    private coerceDecimal(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (typeof value === 'string') {
            const sanitized = value
                .replace(/\u00a0/g, '')
                .replace(/\s+/g, '')
                .replace(/,/g, '.');
            const parsed = Number(sanitized);

            return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
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

    private coerceOptionalNumber(value: unknown): number | null {
        return this.coerceNumber(value);
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
