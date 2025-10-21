export interface Evaluacion {
    id: number;
    evaluacionProgramadaId: number;
    alumnoId: number;
    sedeId: number | null;
    cicloId: number | null;
    seccionId: number | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateEvaluacionPayload {
    evaluacionProgramadaId: number;
    alumnoId: number;
    sedeId: number | null;
    cicloId: number | null;
    seccionId: number | null;
    activo: boolean;
}

export type UpdateEvaluacionPayload = Partial<CreateEvaluacionPayload>;
