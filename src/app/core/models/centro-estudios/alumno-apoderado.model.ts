import { Apoderado, UpsertApoderadoPayload } from './apoderado.model';
import type { AlumnoPersonalDataPayload } from './alumno.model';

export interface AlumnoApoderado {
    id: number;
    alumnoId: number;
    apoderadoId: number;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    apoderado?: Apoderado | null;
}

export interface AlumnoApoderadoUpsertPayload {
    id?: number | null;
    apoderadoId?: number | null;
    activo?: boolean;
    apoderado: UpsertApoderadoPayload;
    alumno?: AlumnoPersonalDataPayload | null;
}
