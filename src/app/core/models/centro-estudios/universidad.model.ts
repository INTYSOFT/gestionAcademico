export interface Universidad {
    id: number;
    nombre: string;
    ciudad?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export type CreateUniversidadPayload = Pick<Universidad, 'nombre' | 'ciudad' | 'activo'>;

export type UpdateUniversidadPayload = Partial<CreateUniversidadPayload> & { id?: number };
