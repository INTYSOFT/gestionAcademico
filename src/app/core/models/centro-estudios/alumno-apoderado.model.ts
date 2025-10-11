import { Apoderado } from './apoderado.model';

export interface AlumnoApoderado {
    id?: number;
    alumnoId: number;
    apoderadoId: number;
    parentesco: string;
    esTitular: boolean;
    apoderado?: Apoderado;
    activo?: boolean;
}

export interface CreateAlumnoApoderadoPayload {
    apoderadoId: number;
    parentesco: string;
    esTitular: boolean;
}

export type UpdateAlumnoApoderadoPayload = Partial<CreateAlumnoApoderadoPayload>;
