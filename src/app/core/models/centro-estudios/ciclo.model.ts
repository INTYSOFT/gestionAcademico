export interface Ciclo {
    id: number;
    nombre: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    capacidadTotal?: number | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export interface CreateCicloPayload {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
    capacidadTotal?: number | null;
    activo: boolean;
}

export type UpdateCicloPayload = Partial<CreateCicloPayload>;
