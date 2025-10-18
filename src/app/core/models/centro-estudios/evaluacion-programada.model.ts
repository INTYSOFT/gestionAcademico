export interface EvaluacionProgramada {
    id: number;
    sedeId: number;
    cicloId: number | null;
    tipoEvaluacionId: number;
    nombre: string;
    fechaInicio: string;
    horaInicio: string;
    horaFin: string;
    carreraId: number | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateEvaluacionProgramadaPayload {
    sedeId: number;
    cicloId: number | null;
    tipoEvaluacionId: number;
    nombre: string;
    fechaInicio: string;
    horaInicio: string;
    horaFin: string;
    carreraId: number | null;
    activo: boolean;
}

export type UpdateEvaluacionProgramadaPayload = Partial<CreateEvaluacionProgramadaPayload>;
