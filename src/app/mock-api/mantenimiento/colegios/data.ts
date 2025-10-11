import { Colegio } from 'app/core/models/centro-estudios/colegio.model';

export const colegiosData: Colegio[] = [
    {
        id: 1,
        nombre: 'Colegio Nacional de Lima',
        ubigeoCode: '150101',
        esPrivado: false,
        activo: true,
        fechaRegistro: '2023-03-12T10:15:00.000Z',
        fechaActualizacion: '2023-03-12T10:15:00.000Z',
        usuaraioRegistroId: 1,
        usuaraioActualizacionId: 1,
    },
    {
        id: 2,
        nombre: 'Colegio Santa María',
        ubigeoCode: '150132',
        esPrivado: true,
        activo: true,
        fechaRegistro: '2023-05-05T09:30:00.000Z',
        fechaActualizacion: '2023-05-05T09:30:00.000Z',
        usuaraioRegistroId: 2,
        usuaraioActualizacionId: 2,
    },
    {
        id: 3,
        nombre: 'Institución Educativa Andina',
        ubigeoCode: '080101',
        esPrivado: false,
        activo: false,
        fechaRegistro: '2023-02-20T14:45:00.000Z',
        fechaActualizacion: '2023-04-18T16:20:00.000Z',
        usuaraioRegistroId: 1,
        usuaraioActualizacionId: 3,
    },
];
