export interface SeccionCiclo {
    id: number;
    cicloId: number;
    seccionId: number;
    nivelId: number;
    sedeId: number;
    capacidad: number;
    precio: number;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateSeccionCicloPayload {
    cicloId: number;
    seccionId: number;
    nivelId: number;
    sedeId: number;
    capacidad: number;
    precio: number;
    activo: boolean;
}

export type UpdateSeccionCicloPayload = Partial<CreateSeccionCicloPayload>;
