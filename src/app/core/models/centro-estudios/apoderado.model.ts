export interface Apoderado {
    id: number;
    apellidos?: string | null;
    nombres?: string | null;
    celular?: string | null;
    correo?: string | null;
    documento?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export interface CreateApoderadoPayload {
    apellidos: string;
    nombres: string;
    celular?: string | null;
    correo?: string | null;
    documento: string;
    activo: boolean;
}

export type UpdateApoderadoPayload = Partial<CreateApoderadoPayload>;
