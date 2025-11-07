import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';
import {
    CreateEvaluacionClavePayload,
    EvaluacionClave,
    UpdateEvaluacionClavePayload,
} from 'app/core/models/centro-estudios/evaluacion-clave.model';

interface EvaluacionClaveApi extends Partial<EvaluacionClave> {
    Id?: number | string;
    EvaluacionProgramadaId?: number | string;
    EvaluacionDetalleId?: number | string;
    PreguntaOrden?: number | string;
    Respuesta?: string | null;
    Ponderacion?: number | string | null;
    Version?: number | string;
    Vigente?: boolean | string | number | null;
    Observacion?: string | null;
    Activo?: boolean | string | number | null;
    FechaRegistro?: string | null;
    FechaActualizacion?: string | null;
    UsuaraioRegistroId?: number | string | null;
    UsuaraioActualizacionId?: number | string | null;
    SedeId?: number | string | null;
    CicloId?: number | string | null;
    SeccionId?: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionClavesService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionClaves;

    listByEvaluacionDetalle(evaluacionDetalleId: number): Observable<EvaluacionClave[]> {
        const url = `${this.resourcePath}/evaluacion_detalle/${evaluacionDetalleId}`;

        return this.http
            .get<EvaluacionClaveApi[]>(this.buildUrl(url), this.createOptions())
            .pipe(
                map((response) =>
                    this.normalizeEvaluacionClaves(response).filter(
                        (clave) => clave.evaluacionDetalleId === evaluacionDetalleId
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

    getEvaluacionClave(id: number): Observable<EvaluacionClave> {
        return this.get<EvaluacionClaveApi>(`${this.resourcePath}/${id}`).pipe(
            map((response) => this.normalizeEvaluacionClaveOrThrow(response))
        );
    }

    create(payload: CreateEvaluacionClavePayload): Observable<EvaluacionClave> {
        const body = this.mapPayloadToApi(payload);

        return this.post<EvaluacionClaveApi>(this.resourcePath, body).pipe(
            map((response) => this.normalizeEvaluacionClaveOrThrow(response))
        );
    }

    update(id: number, payload: UpdateEvaluacionClavePayload): Observable<EvaluacionClave> {
        const body: EvaluacionClaveApi = {
            id,
            Id: id,
            ...this.mapPayloadToApi(payload),
        };

        return this.put<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getEvaluacionClave(id))
        );
    }

    deleteById(id: number): Observable<void> {
        return super.delete<void>(`${this.resourcePath}/${id}`);
    }

    private mapPayloadToApi(
        payload: CreateEvaluacionClavePayload | UpdateEvaluacionClavePayload
    ): EvaluacionClaveApi {
        const normalized: EvaluacionClaveApi = {};

        if (payload.evaluacionProgramadaId !== undefined) {
            normalized.evaluacionProgramadaId = payload.evaluacionProgramadaId;
            normalized.EvaluacionProgramadaId = payload.evaluacionProgramadaId;
        }

        if (payload.evaluacionDetalleId !== undefined) {
            normalized.evaluacionDetalleId = payload.evaluacionDetalleId;
            normalized.EvaluacionDetalleId = payload.evaluacionDetalleId;
        }

        if (payload.preguntaOrden !== undefined) {
            normalized.preguntaOrden = payload.preguntaOrden;
            normalized.PreguntaOrden = payload.preguntaOrden;
        }

        if (payload.respuesta !== undefined) {
            const respuesta = payload.respuesta.trim().toUpperCase();
            normalized.respuesta = respuesta;
            normalized.Respuesta = respuesta;
        }

        if (payload.ponderacion !== undefined) {
            normalized.ponderacion = payload.ponderacion;
            normalized.Ponderacion = payload.ponderacion;
        }

        if (payload.version !== undefined) {
            normalized.version = payload.version;
            normalized.Version = payload.version;
        }

        if (payload.vigente !== undefined) {
            normalized.vigente = payload.vigente;
            normalized.Vigente = payload.vigente;
        }

        if (payload.observacion !== undefined) {
            normalized.observacion = payload.observacion;
            normalized.Observacion = payload.observacion;
        }

        if (payload.activo !== undefined) {
            normalized.activo = payload.activo;
            normalized.Activo = payload.activo;
        }

        if (payload.sedeId !== undefined) {
            normalized.sedeId = payload.sedeId;
            normalized.SedeId = payload.sedeId;
        }

        if (payload.cicloId !== undefined) {
            normalized.cicloId = payload.cicloId;
            normalized.CicloId = payload.cicloId;
        }

        if (payload.seccionId !== undefined) {
            normalized.seccionId = payload.seccionId;
            normalized.SeccionId = payload.seccionId;
        }

        return normalized;
    }

    private normalizeEvaluacionClaves(
        response: EvaluacionClaveApi[] | null | undefined
    ): EvaluacionClave[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeEvaluacionClave(item))
            .filter((item): item is EvaluacionClave => item !== null);
    }

    private normalizeEvaluacionClave(
        item: EvaluacionClaveApi | null | undefined
    ): EvaluacionClave | null {
        if (!item) {
            return null;
        }

        const id = this.parseNumber(item.id ?? item.Id);
        const evaluacionProgramadaId = this.parseNumber(
            item.evaluacionProgramadaId ?? item.EvaluacionProgramadaId
        );
        const evaluacionDetalleId = this.parseNumber(
            item.evaluacionDetalleId ?? item.EvaluacionDetalleId
        );
        const preguntaOrden = this.parseNumber(item.preguntaOrden ?? item.PreguntaOrden);
        const respuesta = (item.respuesta ?? item.Respuesta ?? '').toString().trim();

        if (
            id === null ||
            evaluacionProgramadaId === null ||
            evaluacionDetalleId === null ||
            preguntaOrden === null ||
            !respuesta
        ) {
            return null;
        }

        return {
            id,
            evaluacionProgramadaId,
            evaluacionDetalleId,
            preguntaOrden,
            respuesta,
            ponderacion: this.parseNumber(item.ponderacion ?? item.Ponderacion),
            version: this.parseNumber(item.version ?? item.Version) ?? 1,
            vigente: this.parseBoolean(item.vigente ?? item.Vigente, true),
            observacion: item.observacion ?? item.Observacion ?? null,
            activo: this.parseBoolean(item.activo ?? item.Activo, true),
            fechaRegistro: item.fechaRegistro ?? item.FechaRegistro ?? null,
            fechaActualizacion: item.fechaActualizacion ?? item.FechaActualizacion ?? null,
            usuaraioRegistroId: this.parseNumber(
                item.usuaraioRegistroId ?? item.UsuaraioRegistroId
            ),
            usuaraioActualizacionId: this.parseNumber(
                item.usuaraioActualizacionId ?? item.UsuaraioActualizacionId
            ),
            sedeId: this.parseNumber(item.sedeId ?? item.SedeId),
            cicloId: this.parseNumber(item.cicloId ?? item.CicloId),
            seccionId: this.parseNumber(item.seccionId ?? item.SeccionId),
        };
    }

    private normalizeEvaluacionClaveOrThrow(
        item: EvaluacionClaveApi | null | undefined
    ): EvaluacionClave {
        const clave = this.normalizeEvaluacionClave(item);

        if (!clave) {
            throw new Error('La clave de evaluación recibida es inválida.');
        }

        return clave;
    }

    private parseNumber(value: unknown): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private parseBoolean(value: unknown, fallback: boolean): boolean {
        if (value === null || value === undefined) {
            return fallback;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'number') {
            return value !== 0;
        }

        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (!normalized) {
                return fallback;
            }

            if (normalized === 'true' || normalized === '1') {
                return true;
            }

            if (normalized === 'false' || normalized === '0') {
                return false;
            }
        }

        return fallback;
    }
}
