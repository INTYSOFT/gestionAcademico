export interface Curso {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export interface CreateCursoPayload {
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
}

export type UpdateCursoPayload = Partial<CreateCursoPayload>;
