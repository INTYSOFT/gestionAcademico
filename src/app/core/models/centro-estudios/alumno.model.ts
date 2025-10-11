export interface Alumno {
    id: number;
    dni: string;
    apellidos?: string | null;
    nombres?: string | null;
    fechaNacimiento?: string | null;
    celular?: string | null;
    correo?: string | null;
    ubigeoCode?: string | null;
    colegioOrigen?: string | null;
    direccion?: string | null;
    observacion?: string | null;
    fotoUrl?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
    colegioId?: number | null;
}

export interface CreateAlumnoPayload {
    dni: string;
    apellidos: string;
    nombres: string;
    fechaNacimiento?: string | null;
    celular?: string | null;
    correo?: string | null;
    colegioId: number;
    direccion?: string | null;
    observacion?: string | null;
    activo: boolean;
}

export type UpdateAlumnoPayload = Partial<CreateAlumnoPayload>;
