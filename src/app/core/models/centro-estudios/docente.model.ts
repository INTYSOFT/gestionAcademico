export interface Docente {
    id: number;
    dni: string;
    apellidos: string | null;
    nombres: string | null;
    celular: string | null;
    correo: string | null;
    especialidadId: number | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}

export interface CreateDocentePayload {
    dni: string;
    apellidos: string | null;
    nombres: string | null;
    celular: string | null;
    correo: string | null;
    especialidadId: number | null;
    activo: boolean;
}

export type UpdateDocentePayload = Partial<CreateDocentePayload>;
