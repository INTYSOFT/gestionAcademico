export interface Apoderado {
    id?: number;
    dni: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    nombres: string;
    celular?: string | null;
    correoElectronico?: string | null;
    direccion?: string | null;
    nombresCompletos?: string;
}

export type CreateApoderadoPayload = Omit<Apoderado, 'id' | 'nombresCompletos'>;

export type UpdateApoderadoPayload = Partial<CreateApoderadoPayload>;
