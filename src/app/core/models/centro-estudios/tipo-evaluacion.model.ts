export interface TipoEvaluacion {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateTipoEvaluacionPayload {
    nombre: string;
    descripcion: string | null;
    activo: boolean;
}

export type UpdateTipoEvaluacionPayload = CreateTipoEvaluacionPayload;
