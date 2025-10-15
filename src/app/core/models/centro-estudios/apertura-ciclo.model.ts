export interface AperturaCiclo {
    id: number;
    sedeId: number;
    cicloId: number;
    observacion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateAperturaCicloPayload {
    sedeId: number;
    cicloId: number;
    observacion: string | null;
    activo: boolean;
}

export interface UpdateAperturaCicloPayload {
    sedeId: number;
    cicloId: number;
    observacion: string | null;
    activo: boolean;
}
