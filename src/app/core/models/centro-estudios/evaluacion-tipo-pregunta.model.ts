export interface EvaluacionTipoPregunta {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateEvaluacionTipoPreguntaPayload {
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activo: boolean;
}

export type UpdateEvaluacionTipoPreguntaPayload = CreateEvaluacionTipoPreguntaPayload;
