export interface Carrera {
    id: number;
    nombre: string;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export type CreateCarreraPayload = Pick<Carrera, 'nombre' | 'activo'>;

export type UpdateCarreraPayload = Partial<CreateCarreraPayload> & { id?: number };
