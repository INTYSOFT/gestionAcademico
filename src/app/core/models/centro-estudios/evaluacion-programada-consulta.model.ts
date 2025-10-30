export interface EvaluacionProgramadaConsulta {
    estadoId: number | null;
    evaluacionId: number;
    evaluacionProgramadaId: number;
    sede: string | null;
    ciclo: string | null;
    seccion: string | null;
    alumnoDni: string | null;
    alumnoApellidos: string | null;
    alumnoNombres: string | null;
    alumnoCelular: string | null;
}
