export interface Alumno {
    id?: number;
    dni: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    nombres: string;
    fechaNacimiento: string;
    celular?: string | null;
    correoElectronico?: string | null;
    direccion?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
}

export type CreateAlumnoPayload = Omit<Alumno, 'id' | 'fechaRegistro' | 'fechaActualizacion'>;

export type UpdateAlumnoPayload = Partial<CreateAlumnoPayload>;
