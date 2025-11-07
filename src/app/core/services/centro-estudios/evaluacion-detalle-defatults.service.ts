import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';
import {
    CreateEvaluacionDetalleDefatultPayload,
    EvaluacionDetalleDefatult,
    UpdateEvaluacionDetalleDefatultPayload,
} from 'app/core/models/centro-estudios/evaluacion-detalle-defatult.model';
import { parseEvaluacionDetalleNumber } from './evaluacion-detalles.service';

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

    listAll(): Observable<EvaluacionDetalleDefatult[]> {
        return this.http
            .get<EvaluacionDetalleDefatultApi[]>(
                this.buildUrl(this.resourcePath),
                this.createOptions()
            )
            .pipe(
                map((records) => this.normalizeEvaluacionDetalleDefatults(records)),
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
            switchMap(() => this.getEvaluacionDetalleDefatult(id))
        );
    }

    private getEvaluacionDetalleDefatult(id: number): Observable<EvaluacionDetalleDefatult> {
        return this.get<EvaluacionDetalleDefatultApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionDetalleDefatultOrThrow(response))
        );
    }

    private mapPayloadToApi(
        payload: CreateEvaluacionDetalleDefatultPayload | UpdateEvaluacionDetalleDefatultPayload
    ): EvaluacionDetalleDefatultApi {
        const body: EvaluacionDetalleDefatultApi = {};

        body.rangoInicio = payload.rangoInicio;
        body.RangoInicio = payload.rangoInicio;
        body.rangoFin = payload.rangoFin;
        body.RangoFin = payload.rangoFin;
        body.valorBuena = payload.valorBuena;
        body.ValorBuena = payload.valorBuena;
        body.valorMala = payload.valorMala;
        body.ValorMala = payload.valorMala;
        body.valorBlanca = payload.valorBlanca;
        body.ValorBlanca = payload.valorBlanca;
        body.observacion = payload.observacion;
        body.Observacion = payload.observacion;
        body.activo = payload.activo;
        body.Activo = payload.activo;
        body.evaluacionTipoPreguntaId = payload.evaluacionTipoPreguntaId;
        body.EvaluacionTipoPreguntaId = payload.evaluacionTipoPreguntaId;

        return body;
    }

    private normalizeEvaluacionDetalleDefatults(
        records: EvaluacionDetalleDefatultApi[]
    ): EvaluacionDetalleDefatult[] {
        return records
            .map((record) => this.normalizeEvaluacionDetalleDefatult(record))
            .filter((record): record is EvaluacionDetalleDefatult => record !== null);
    }

    private normalizeEvaluacionDetalleDefatultOrThrow(
        record: EvaluacionDetalleDefatultApi
    ): EvaluacionDetalleDefatult {
        const normalized = this.normalizeEvaluacionDetalleDefatult(record);
        if (!normalized) {
            throw new Error('No fue posible interpretar el detalle por defecto recibido.');
        }

        return normalized;
    }

    private normalizeEvaluacionDetalleDefatult(
        record: EvaluacionDetalleDefatultApi
    ): EvaluacionDetalleDefatult | null {
        const id = this.normalizeId(record.Id ?? record.id);
        const rangoInicio = parseEvaluacionDetalleNumber(record.RangoInicio ?? record.rangoInicio);
        const rangoFin = parseEvaluacionDetalleNumber(record.RangoFin ?? record.rangoFin);
        const valorBuena = parseEvaluacionDetalleNumber(record.ValorBuena ?? record.valorBuena);
        const valorMala = parseEvaluacionDetalleNumber(record.ValorMala ?? record.valorMala);
        const valorBlanca = parseEvaluacionDetalleNumber(record.ValorBlanca ?? record.valorBlanca);
        const evaluacionTipoPreguntaId = this.normalizeNumber(
            record.EvaluacionTipoPreguntaId ?? record.evaluacionTipoPreguntaId
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
            observacion: this.normalizeString(record.Observacion ?? record.observacion),
            activo: this.normalizeBoolean(record.Activo ?? record.activo),
            fechaRegistro: this.normalizeDate(record.FechaRegistro ?? record.fechaRegistro),
            fechaActualizacion: this.normalizeDate(
                record.FechaActualizacion ?? record.fechaActualizacion
            ),
            usuaraioRegistroId: this.normalizeNullableNumber(
                record.UsuaraioRegistroId ?? record.usuaraioRegistroId
            ),
            usuaraioActualizacionId: this.normalizeNullableNumber(
                record.UsuaraioActualizacionId ?? record.usuaraioActualizacionId
            ),
            evaluacionTipoPreguntaId,
        };
    }

    private normalizeId(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : null;
        }

        if (typeof value === 'string') {
            const parsed = Number.parseInt(value, 10);
            return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
    }

    private normalizeNumber(value: unknown): number | null {
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

            const parsed = Number(trimmed);
            return Number.isNaN(parsed) ? null : parsed;
        }

        return null;
    }

    private normalizeNullableNumber(value: unknown): number | null {
        const normalized = this.normalizeNumber(value);
        return normalized ?? null;
    }

    private normalizeString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    private normalizeBoolean(value: unknown): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'number') {
            return value !== 0;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return ['true', '1', 'si', 'sí', 'on', 'activo'].includes(normalized);
        }

        return false;
    }

    private normalizeDate(value: unknown): string | null {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }

        return null;
    }
}
