export interface Apoderado {
    id: number;
    dni: string;
    apellidos?: string | null;
    nombres?: string | null;
    celular?: string | null;
    correo?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
}

export interface UpsertApoderadoPayload {
    id?: number | null;
    dni: string;
    apellidos?: string | null;
    nombres?: string | null;
    celular?: string | null;
    correo?: string | null;
    activo?: boolean;
}
