export interface ConceptoTipo {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateConceptoTipoPayload {
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
}

export type UpdateConceptoTipoPayload = CreateConceptoTipoPayload;
