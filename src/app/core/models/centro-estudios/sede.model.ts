export interface Sede {
    id: number;
    nombre: string;
    ubigeoCode: string;
    direccion?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export type CreateSedePayload = Pick<Sede, 'nombre' | 'ubigeoCode' | 'direccion' | 'activo'>;

export type UpdateSedePayload = Partial<CreateSedePayload>;
