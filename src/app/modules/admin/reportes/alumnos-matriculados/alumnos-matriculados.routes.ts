import { Routes } from '@angular/router';
import { ReporteMatriculasPorSedeCicloComponent } from './alumnos-matriculados.component';

export const reportesAlumnosMatriculadosRoutes: Routes = [
    {
        path: '',
        component: ReporteMatriculasPorSedeCicloComponent,
        data: {
            breadcrumb: 'Alumnos matriculados',
        },
    },
];
