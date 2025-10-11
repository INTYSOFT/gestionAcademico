export interface Colegio {
    id: number;
    nombre: string;
    ubigeoCode?: string | null;
    esPrivado?: boolean | null;
    activo: boolean;
    fechaRegistro?: string | null;
    fechaActualizacion?: string | null;
    usuaraioRegistroId?: number | null;
    usuaraioActualizacionId?: number | null;
}
