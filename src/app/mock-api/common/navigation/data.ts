/* eslint-disable */
import { FuseNavigationItem } from '@fuse/components/navigation';

export const defaultNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    },
    {
        id      : 'evaluacion',
        title   : 'Evaluación',
        type    : 'collapsable',
        icon    : 'heroicons_outline:clipboard-document',
        children: [
            {
                id   : 'evaluacion.programar',
                title: 'Programar',
                type : 'basic',
                icon : 'heroicons_outline:calendar-days',
                link : '/evaluacion/programar'
            },
            {
                id   : 'evaluacion.puntuacion',
                title: 'Puntuación',
                type : 'basic',
                icon : 'heroicons_outline:calculator',
                link : '/evaluacion/puntuacion'
            },
            {
                id   : 'evaluacion.tipo-evaluacion',
                title: 'Tipo evaluación',
                type : 'basic',
                icon : 'heroicons_outline:check-circle',
                link : '/evaluacion/tipo-evaluacion'
            },
            {
                id   : 'evaluacion.competencias-preguntas',
                title: 'Competencias preguntas',
                type : 'basic',
                icon : 'heroicons_outline:question-mark-circle',
                link : '/evaluacion/competencias-preguntas'
            }
        ]
    },
    {
        id      : 'matricula',
        title   : 'Matricula',
        type    : 'collapsable',
        icon    : 'heroicons_outline:clipboard-document-list',
        children: [
            {
                id   : 'matricula.registro',
                title: 'Matrícula',
                type : 'basic',
                icon : 'heroicons_outline:clipboard-document-check',
                link : '/matricula/registro'
            },
            {
                id   : 'matricula.concepto',
                title: 'Concepto',
                type : 'basic',
                icon : 'heroicons_outline:document-currency-dollar',
                link : '/matricula/concepto'
            },
            {
                id   : 'matricula.tipo-concepto',
                title: 'Tipo de concepto',
                type : 'basic',
                icon : 'heroicons_outline:tag',
                link : '/matricula/tipo-concepto'
            }
        ]
    },
    {
        id      : 'reportes',
        title   : 'Reportes',
        type    : 'collapsable',
        icon    : 'heroicons_outline:chart-bar-square',
        children: [
            {
                id   : 'reportes.alumnos-matriculados',
                title: 'Alumnos matriculados',
                type : 'basic',
                icon : 'heroicons_outline:document-chart-bar',
                link : '/reportes/alumnos-matriculados'
            }
        ]
    },
    {
        id      : 'mantenimiento',
        title   : 'Mantenimiento',
        type    : 'collapsable',
        icon    : 'heroicons_outline:wrench-screwdriver',
        children: [
            {
                id   : 'mantenimiento.sedes',
                title: 'Sedes',
                type : 'basic',
                icon : 'heroicons_outline:building-office',
                link : '/mantenimiento/sedes'
            },
            {
                id   : 'mantenimiento.ciclos',
                title: 'Ciclos',
                type : 'basic',
                icon : 'heroicons_outline:calendar-days',
                link : '/mantenimiento/ciclos'
            },
            {
                id   : 'mantenimiento.secciones',
                title: 'Secciones',
                type : 'basic',
                icon : 'heroicons_outline:queue-list',
                link : '/mantenimiento/secciones'
            },
            {
                id   : 'mantenimiento.seccion-ciclo',
                title: 'Secciones por ciclo',
                type : 'basic',
                icon : 'heroicons_outline:squares-2x2',
                link : '/mantenimiento/seccion-ciclo'
            },
            {
                id   : 'mantenimiento.niveles',
                title: 'Niveles',
                type : 'basic',
                icon : 'heroicons_outline:rectangle-group',
                link : '/mantenimiento/niveles'
            },
            {
                id   : 'mantenimiento.nivel-seccion',
                title: 'Nivel Sección',
                type : 'basic',
                icon : 'heroicons_outline:rectangle-stack',
                link : '/mantenimiento/nivel-seccion'
            },
            {
                id   : 'mantenimiento.cursos',
                title: 'Cursos',
                type : 'basic',
                icon : 'heroicons_outline:book-open',
                link : '/mantenimiento/cursos'
            },
            {
                id   : 'mantenimiento.docentes',
                title: 'Docentes',
                type : 'basic',
                icon : 'heroicons_outline:user-circle',
                link : '/mantenimiento/docentes'
            },
            {
                id   : 'mantenimiento.especialidades',
                title: 'Especialidad Docente',
                type : 'basic',
                icon : 'heroicons_outline:academic-cap',
                link : '/mantenimiento/especialidad-docente'
            },
            {
                id   : 'mantenimiento.universidades',
                title: 'Universidades',
                type : 'basic',
                icon : 'heroicons_outline:building-office-2',
                link : '/mantenimiento/universidades'
            },
            {
                id   : 'mantenimiento.carreras',
                title: 'Carreras',
                type : 'basic',
                icon : 'heroicons_outline:identification',
                link : '/mantenimiento/carreras'
            }
        ]
    },
    {
        id      : 'alumno',
        title   : 'Alumno',
        type    : 'collapsable',
        icon    : 'heroicons_outline:user-group',
        children: [
            {
                id   : 'alumno.alumnos',
                title: 'Alumnos',
                type : 'basic',
                icon : 'heroicons_outline:user-group',
                link : '/mantenimiento/alumnos'
            },
            {
                id   : 'alumno.colegios',
                title: 'Colegios',
                type : 'basic',
                icon : 'heroicons_outline:building-library',
                link : '/mantenimiento/colegios'
            },
            {
                id   : 'alumno.apoderados',
                title: 'Apoderados',
                type : 'basic',
                icon : 'heroicons_outline:user-group',
                link : '/mantenimiento/apoderados'
            }
        ]
    }
];
export const compactNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    },
    {
        id   : 'evaluacion',
        title: 'Evaluación',
        type : 'collapsable',
        icon : 'heroicons_outline:clipboard-document'
    },
    {
        id   : 'matricula',
        title: 'Matricula',
        type : 'collapsable',
        icon : 'heroicons_outline:clipboard-document-list'
    },
    {
        id   : 'reportes',
        title: 'Reportes',
        type : 'collapsable',
        icon : 'heroicons_outline:chart-bar-square'
    },
    {
        id   : 'mantenimiento',
        title: 'Mantenimiento',
        type : 'collapsable',
        icon : 'heroicons_outline:wrench-screwdriver'
    },
    {
        id   : 'alumno',
        title: 'Alumno',
        type : 'collapsable',
        icon : 'heroicons_outline:user-group'
    }
];
export const futuristicNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    },
    {
        id   : 'evaluacion',
        title: 'Evaluación',
        type : 'collapsable',
        icon : 'heroicons_outline:clipboard-document'
    },
    {
        id   : 'matricula',
        title: 'Matricula',
        type : 'collapsable',
        icon : 'heroicons_outline:clipboard-document-list'
    },
    {
        id   : 'reportes',
        title: 'Reportes',
        type : 'collapsable',
        icon : 'heroicons_outline:chart-bar-square'
    },
    {
        id   : 'mantenimiento',
        title: 'Mantenimiento',
        type : 'collapsable',
        icon : 'heroicons_outline:wrench-screwdriver'
    },
    {
        id   : 'alumno',
        title: 'Alumno',
        type : 'collapsable',
        icon : 'heroicons_outline:user-group'
    }
];
export const horizontalNavigation: FuseNavigationItem[] = [
    {
        id   : 'example',
        title: 'Example',
        type : 'basic',
        icon : 'heroicons_outline:chart-pie',
        link : '/example'
    },
    {
        id   : 'matricula',
        title: 'Matricula',
        type : 'group',
        icon : 'heroicons_outline:clipboard-document-list',
        children: [
            {
                id   : 'matricula.registro',
                title: 'Matrícula',
                type : 'basic',
                icon : 'heroicons_outline:clipboard-document-check',
                link : '/matricula/registro'
            },
            {
                id   : 'matricula.concepto',
                title: 'Concepto',
                type : 'basic',
                icon : 'heroicons_outline:document-currency-dollar',
                link : '/matricula/concepto'
            },
            {
                id   : 'matricula.tipo-concepto',
                title: 'Tipo de concepto',
                type : 'basic',
                icon : 'heroicons_outline:tag',
                link : '/matricula/tipo-concepto'
            }
        ]
    },
    {
        id   : 'reportes',
        title: 'Reportes',
        type : 'group',
        icon : 'heroicons_outline:chart-bar-square',
        children: []
    },
    {
        id   : 'evaluacion',
        title: 'Evaluación',
        type : 'group',
        icon : 'heroicons_outline:clipboard-document',
        children: [
            {
                id   : 'evaluacion.programar',
                title: 'Programar',
                type : 'basic',
                icon : 'heroicons_outline:calendar-days',
                link : '/evaluacion/programar'
            },
            {
                id   : 'evaluacion.puntuacion',
                title: 'Puntuación',
                type : 'basic',
                icon : 'heroicons_outline:calculator',
                link : '/evaluacion/puntuacion'
            },
            {
                id   : 'evaluacion.tipo-evaluacion',
                title: 'Tipo evaluación',
                type : 'basic',
                icon : 'heroicons_outline:check-circle',
                link : '/evaluacion/tipo-evaluacion'
            },
            {
                id   : 'evaluacion.competencias-preguntas',
                title: 'Competencias preguntas',
                type : 'basic',
                icon : 'heroicons_outline:question-mark-circle',
                link : '/evaluacion/competencias-preguntas'
            }
        ]
    },
    {
        id   : 'mantenimiento',
        title: 'Mantenimiento',
        type : 'group',
        icon : 'heroicons_outline:wrench-screwdriver',
        children: [
            {
                id   : 'mantenimiento.sedes',
                title: 'Sedes',
                type : 'basic',
                icon : 'heroicons_outline:building-office',
                link : '/mantenimiento/sedes'
            },
            {
                id   : 'mantenimiento.ciclos',
                title: 'Ciclos',
                type : 'basic',
                icon : 'heroicons_outline:calendar-days',
                link : '/mantenimiento/ciclos'
            },
            {
                id   : 'mantenimiento.secciones',
                title: 'Secciones',
                type : 'basic',
                icon : 'heroicons_outline:queue-list',
                link : '/mantenimiento/secciones'
            },
            {
                id   : 'mantenimiento.seccion-ciclo',
                title: 'Secciones por ciclo',
                type : 'basic',
                icon : 'heroicons_outline:squares-2x2',
                link : '/mantenimiento/seccion-ciclo'
            },
            {
                id   : 'mantenimiento.niveles',
                title: 'Niveles',
                type : 'basic',
                icon : 'heroicons_outline:rectangle-group',
                link : '/mantenimiento/niveles'
            },
            {
                id   : 'mantenimiento.nivel-seccion',
                title: 'Nivel Sección',
                type : 'basic',
                icon : 'heroicons_outline:rectangle-stack',
                link : '/mantenimiento/nivel-seccion'
            },
            {
                id   : 'mantenimiento.cursos',
                title: 'Cursos',
                type : 'basic',
                icon : 'heroicons_outline:book-open',
                link : '/mantenimiento/cursos'
            },
            {
                id   : 'mantenimiento.docentes',
                title: 'Docentes',
                type : 'basic',
                icon : 'heroicons_outline:user-circle',
                link : '/mantenimiento/docentes'
            },
            {
                id   : 'mantenimiento.especialidades',
                title: 'Especialidad Docente',
                type : 'basic',
                icon : 'heroicons_outline:academic-cap',
                link : '/mantenimiento/especialidad-docente'
            },
            {
                id   : 'mantenimiento.universidades',
                title: 'Universidades',
                type : 'basic',
                icon : 'heroicons_outline:building-office-2',
                link : '/mantenimiento/universidades'
            },
            {
                id   : 'mantenimiento.carreras',
                title: 'Carreras',
                type : 'basic',
                icon : 'heroicons_outline:identification',
                link : '/mantenimiento/carreras'
            }
        ]
    },
    {
        id      : 'alumno',
        title   : 'Alumno',
        type    : 'group',
        icon    : 'heroicons_outline:user-group',
        children: [
            {
                id   : 'alumno.alumnos',
                title: 'Alumnos',
                type : 'basic',
                icon : 'heroicons_outline:user-group',
                link : '/mantenimiento/alumnos'
            },
            {
                id   : 'alumno.colegios',
                title: 'Colegios',
                type : 'basic',
                icon : 'heroicons_outline:building-library',
                link : '/mantenimiento/colegios'
            },
            {
                id   : 'alumno.apoderados',
                title: 'Apoderados',
                type : 'basic',
                icon : 'heroicons_outline:user-group',
                link : '/mantenimiento/apoderados'
            }
        ]
    }
];
