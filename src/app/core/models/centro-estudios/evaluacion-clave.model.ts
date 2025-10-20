export interface EvaluacionClave {
    id: number;
    evaluacionProgramadaId: number;
    evaluacionDetalleId: number;
    preguntaOrden: number;
    respuesta: string;
    ponderacion: number | null;
    version: number;
    vigente: boolean;
    observacion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
    sedeId: number | null;
    cicloId: number | null;
    seccionId: number | null;
}

export interface CreateEvaluacionClavePayload {
    evaluacionProgramadaId: number;
    evaluacionDetalleId: number;
    preguntaOrden: number;
    respuesta: string;
    ponderacion: number | null;
    version: number;
    vigente: boolean;
    observacion: string | null;
    activo: boolean;
    sedeId: number | null;
    cicloId: number | null;
    seccionId: number | null;
}

export interface UpdateEvaluacionClavePayload extends CreateEvaluacionClavePayload {}
