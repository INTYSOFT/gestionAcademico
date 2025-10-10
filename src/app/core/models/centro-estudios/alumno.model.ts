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

export type AlumnoPersonalDataPayload = Pick<
    Alumno,
    | 'dni'
    | 'apellidos'
    | 'nombres'
    | 'fechaNacimiento'
    | 'celular'
    | 'correo'
    | 'ubigeoCode'
    | 'colegioOrigen'
    | 'carreraActualId'
    | 'fotoUrl'
    | 'activo'
>;

export interface UpsertAlumnoPayload extends Omit<AlumnoPersonalDataPayload, 'fechaNacimiento'> {
    fechaNacimiento?: string | Date | null;
    alumnoApoderados: AlumnoApoderadoUpsertPayload[];
    alumno?: AlumnoPersonalDataPayload | null;
}

export type CreateAlumnoPayload = UpsertAlumnoPayload;

export type UpdateAlumnoPayload = UpsertAlumnoPayload & { id?: number };
