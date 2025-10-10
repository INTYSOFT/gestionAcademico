import { AlumnoApoderado, AlumnoApoderadoUpsertPayload } from './alumno-apoderado.model';

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
    carreraActualId?: number | null;
    fotoUrl?: string | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    alumnoApoderados?: AlumnoApoderado[];
}

export interface UpsertAlumnoPayload {
    dni: string;
    apellidos?: string | null;
    nombres?: string | null;
    fechaNacimiento?: string | Date | null;
    celular?: string | null;
    correo?: string | null;
    ubigeoCode?: string | null;
    colegioOrigen?: string | null;
    carreraActualId?: number | null;
    fotoUrl?: string | null;
    activo: boolean;
    apoderados: AlumnoApoderadoUpsertPayload[];
}

export type CreateAlumnoPayload = UpsertAlumnoPayload;

export type UpdateAlumnoPayload = UpsertAlumnoPayload & { id?: number };
