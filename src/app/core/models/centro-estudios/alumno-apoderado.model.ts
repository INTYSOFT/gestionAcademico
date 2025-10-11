import { Apoderado } from './apoderado.model';
import { Parentesco } from './parentesco.model';

export interface AlumnoApoderado {
    id: number;
    alumnoId: number;
    apoderadoId: number;
    parentescoId?: number | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
    apoderado?: Apoderado;
    parentesco?: Parentesco;
}

export interface CreateAlumnoApoderadoPayload {
    alumnoId: number;
    apoderadoId: number;
    parentescoId: number;
}

export interface UpdateAlumnoApoderadoPayload {
    parentescoId: number;
}
