import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';
import { EvaluacionProgramadaConsulta } from 'app/core/models/centro-estudios/evaluacion-programada-consulta.model';

interface EvaluacionProgramadaConsultaApi extends Partial<EvaluacionProgramadaConsulta> {
    EstadoId?: number | string | null;
    EvaluacionId?: number | string;
    EvaluacionProgramadaId?: number | string;
    Sede?: string | null;
    Ciclo?: string | null;
    Seccion?: string | null;
    AlumnoDni?: string | null;
    AlumnoApellidos?: string | null;
    AlumnoNombres?: string | null;
    AlumnoCelular?: string | null;
}

@Injectable({ providedIn: 'root' })
export class EvaluacionProgramadaConsultasService extends ApiMainService {
    private readonly resourcePath = CENTRO_ESTUDIOS_API.evaluacionProgramadaConsultas;

    listByEvaluacionProgramadaId(
        evaluacionProgramadaId: number
    ): Observable<EvaluacionProgramadaConsulta[]> {
        const endpoint = `${this.resourcePath}/${evaluacionProgramadaId}`;

        return this.http
            .get<EvaluacionProgramadaConsultaApi[]>(this.buildUrl(endpoint), this.createOptions())
            .pipe(
                map((response) => this.normalizeConsultas(response)),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 404) {
                        return of([]);
                    }

                    return this.handleError(error);
                })
            );
    }

    private normalizeConsultas(
        response: EvaluacionProgramadaConsultaApi[] | null | undefined
    ): EvaluacionProgramadaConsulta[] {
        if (!Array.isArray(response)) {
            return [];
        }

        return response
            .map((item) => this.normalizeConsulta(item))
            .filter((consulta): consulta is EvaluacionProgramadaConsulta => consulta !== null);
    }

    private normalizeConsulta(
        raw: EvaluacionProgramadaConsultaApi | null | undefined
    ): EvaluacionProgramadaConsulta | null {
        if (!raw) {
            return null;
        }

        const evaluacionId = this.coerceNumber(raw.evaluacionId ?? raw.EvaluacionId);
        const evaluacionProgramadaId = this.coerceNumber(
            raw.evaluacionProgramadaId ?? raw.EvaluacionProgramadaId
        );

        if (evaluacionId === null || evaluacionProgramadaId === null) {
            return null;
        }

        return {
            estadoId: this.coerceOptionalNumber(raw.estadoId ?? raw.EstadoId),
            evaluacionId,
            evaluacionProgramadaId,
            sede: this.coerceOptionalString(raw.sede ?? raw.Sede),
            ciclo: this.coerceOptionalString(raw.ciclo ?? raw.Ciclo),
            seccion: this.coerceOptionalString(raw.seccion ?? raw.Seccion),
            alumnoDni: this.coerceOptionalString(raw.alumnoDni ?? raw.AlumnoDni),
            alumnoApellidos: this.coerceOptionalString(raw.alumnoApellidos ?? raw.AlumnoApellidos),
            alumnoNombres: this.coerceOptionalString(raw.alumnoNombres ?? raw.AlumnoNombres),
            alumnoCelular: this.coerceOptionalString(raw.alumnoCelular ?? raw.AlumnoCelular),
        };
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
}
