import { Sede } from 'app/core/models/centro-estudios/sede.model';

const now = new Date().toISOString();

export const sedesData: Sede[] = [
    {
        id: '1b1e3bb9-9e5f-437c-a6f2-7d1fb26a4a19',
        nombre: 'Sede Central',
        ubigeoCode: '150101',
        direccion: 'Av. Los Próceres 123',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
    },
    {
        id: 'e7c6b4a0-88ed-4c54-9cb7-b45c6a8350bf',
        nombre: 'Sede Norte',
        ubigeoCode: '150102',
        direccion: 'Jr. Amazonas 456',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
    },
];
