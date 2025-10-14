export interface Seccion {
    id: number;
    nombre: string;
    capacidad: number;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateSeccionPayload {
    nombre: string;
    capacidad: number;
    activo: boolean;
}

export type UpdateSeccionPayload = CreateSeccionPayload;
