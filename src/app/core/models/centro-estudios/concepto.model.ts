export interface Concepto {
    id: number;
    nombre: string;
    precio: number;
    impuesto: number | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
    conceptoTipoId: number | null;
}

export interface CreateConceptoPayload {
    nombre: string;
    precio: number;
    impuesto?: number | null;
    activo: boolean;
    conceptoTipoId?: number | null;
}

export type UpdateConceptoPayload = CreateConceptoPayload;
