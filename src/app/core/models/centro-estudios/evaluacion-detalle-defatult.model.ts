export interface EvaluacionDetalleDefatult {
    id: number;
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
    evaluacionTipoPreguntaId: number;
}

export interface CreateEvaluacionDetalleDefatultPayload {
    rangoInicio: number;
    rangoFin: number;
    valorBuena: number;
    valorMala: number;
    valorBlanca: number;
    observacion?: string | null;
    activo: boolean;
    evaluacionTipoPreguntaId: number;
}

export type UpdateEvaluacionDetalleDefatultPayload = Partial<CreateEvaluacionDetalleDefatultPayload>;
