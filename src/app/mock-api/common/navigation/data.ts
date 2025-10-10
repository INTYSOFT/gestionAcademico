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
                id   : 'mantenimiento.alumnos',
                title: 'Alumnos',
                type : 'basic',
                icon : 'heroicons_outline:user-group',
                link : '/mantenimiento/alumnos'
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
        id   : 'mantenimiento',
        title: 'Mantenimiento',
        type : 'collapsable',
        icon : 'heroicons_outline:wrench-screwdriver'
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
        id   : 'mantenimiento',
        title: 'Mantenimiento',
        type : 'collapsable',
        icon : 'heroicons_outline:wrench-screwdriver'
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
                id   : 'mantenimiento.alumnos',
                title: 'Alumnos',
                type : 'basic',
                icon : 'heroicons_outline:user-group',
                link : '/mantenimiento/alumnos'
            }
        ]
    }
];
