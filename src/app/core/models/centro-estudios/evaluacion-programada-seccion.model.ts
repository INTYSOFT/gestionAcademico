export interface EvaluacionProgramadaSeccion {
    id: number;
    evaluacionProgramadaId: number;
    seccionCicloId: number;
    seccionId: number | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateEvaluacionProgramadaSeccionPayload {
    evaluacionProgramadaId: number;
    seccionCicloId: number;
    seccionId: number | null;
    activo: boolean;
}

export type UpdateEvaluacionProgramadaSeccionPayload = Partial<CreateEvaluacionProgramadaSeccionPayload>;
