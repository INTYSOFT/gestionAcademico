export interface Apoderado {
    id: number;
    documento?: string | null;
    apellidos?: string | null;
    nombres?: string | null;
    celular?: string | null;
    correo?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export interface UpsertApoderadoPayload {
    id?: number | null;
    documento: string;
    apellidos?: string | null;
    nombres?: string | null;
    celular?: string | null;
    correo?: string | null;
    activo?: boolean;
}
