import { Sede } from 'app/core/models/centro-estudios/sede.model';

const now = new Date().toISOString();

export const sedesData: Sede[] = [
    {
        id: 1,
        nombre: 'Sede Central',
        ubigeoCode: '150101',
        direccion: 'Av. Los Próceres 123',
        activo: true,
        fechaRegistro: now,
        fechaActualizacion: now,
        usuaraioRegistroId: null,
        usuaraioActualizacionId: null,
    },
    {
        id: 2,
        nombre: 'Sede Norte',
        ubigeoCode: '150102',
        direccion: 'Jr. Amazonas 456',
        activo: false,
        fechaRegistro: now,
        fechaActualizacion: now,
        usuaraioRegistroId: null,
        usuaraioActualizacionId: null,
    },
];
