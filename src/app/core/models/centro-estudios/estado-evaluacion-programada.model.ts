export interface EstadoEvaluacionProgramada {
    id: number;
    nombre: string;
    codigo: string;
    orden: number;
    descripcion: string | null;
    activo: boolean;
    fechaRegistro: string | null;
    fechaActualizacion: string | null;
    usuaraioRegistroId: number | null;
    usuaraioActualizacionId: number | null;
}
