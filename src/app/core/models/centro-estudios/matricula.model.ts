export interface Matricula {
    id: number;
    alumnoId: number;
    seccionCicloId: number;
    sedeId: number;
    cicloId: number;
    seccionId: number;
    carnetUrl: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
    carreraId: number | null;
}

export interface MatriculaItem {
    id: number;
    matriculaId: number;
    conceptoId: number;
    cantidad: number;
    precioUnit: number;
    descuento: number;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}

export interface CreateMatriculaPayload {
    alumnoId: number;
    seccionCicloId: number;
    sedeId: number;
    cicloId: number;
    seccionId: number;
    carnetUrl?: string | null;
    activo?: boolean;
    carreraId?: number | null;
}

export interface CreateMatriculaItemPayload {
    conceptoId: number;
    cantidad: number;
    precioUnit: number;
    descuento: number;
    activo?: boolean;
}

export interface CreateMatriculaWithItemsPayload extends CreateMatriculaPayload {
    items: CreateMatriculaItemPayload[];
}

export interface MatriculaWithItems {
    matricula: Matricula;
    items: MatriculaItem[];
}
