export interface Sede {
    id: string;
    nombre: string;
    ubigeoCode: string;
    direccion?: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
}

export type CreateSedePayload = Pick<Sede, 'nombre' | 'ubigeoCode' | 'direccion'>;

export type UpdateSedePayload = Partial<CreateSedePayload>;
