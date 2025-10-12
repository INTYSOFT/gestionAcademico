import { Universidad } from 'app/core/models/centro-estudios/universidad.model';

export const universidadesData: Universidad[] = [
    {
        id: 1,
        nombre: 'Universidad Nacional Mayor de San Marcos',
        ciudad: 'Lima',
        activo: true,
        fechaRegistro: '2023-01-15T10:30:00Z',
        fechaActualizacion: '2023-06-10T12:00:00Z',
        usuaraioRegistroId: 1,
        usuaraioActualizacionId: 2,
    },
    {
        id: 2,
        nombre: 'Pontificia Universidad Católica del Perú',
        ciudad: 'Lima',
        activo: true,
        fechaRegistro: '2023-02-20T09:15:00Z',
        fechaActualizacion: '2023-05-05T11:45:00Z',
        usuaraioRegistroId: 1,
        usuaraioActualizacionId: 3,
    },
    {
        id: 3,
        nombre: 'Universidad Nacional de Ingeniería',
        ciudad: 'Lima',
        activo: false,
        fechaRegistro: '2022-11-05T08:00:00Z',
        fechaActualizacion: '2023-03-18T14:20:00Z',
        usuaraioRegistroId: 2,
        usuaraioActualizacionId: 4,
    },
];
