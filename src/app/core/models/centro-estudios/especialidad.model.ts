export interface Especialidad {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export interface CreateEspecialidadPayload {
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
}

export type UpdateEspecialidadPayload = Partial<CreateEspecialidadPayload>;
