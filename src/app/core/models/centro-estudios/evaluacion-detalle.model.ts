export interface EvaluacionDetalle {
    id: number;
    evaluacionProgramadaId: number;
    seccionId: number | null;
    rangoInicio: number;
    rangoFin: number;
    valorBuena: number;
    valorMala: number;
    valorBlanca: number;
    observacion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateEvaluacionDetallePayload {
    evaluacionProgramadaId: number;
    seccionId: number | null;
    rangoInicio: number;
    rangoFin: number;
    valorBuena: number;
    valorMala: number;
    valorBlanca: number;
    observacion: string | null;
    activo: boolean;
}

export interface UpdateEvaluacionDetallePayload extends CreateEvaluacionDetallePayload {}
