import { Injectable } from '@angular/core';
import { FuseMockApiService } from '@fuse/lib/mock-api';
import { assign, cloneDeep } from 'lodash-es';
import { universidadesData } from './data';

@Injectable({ providedIn: 'root' })
export class UniversidadesMockApi {
    private _universidades = cloneDeep(universidadesData);

    constructor(private readonly mockApi: FuseMockApiService) {
        this.registerHandlers();
    }

    registerHandlers(): void {
        this.mockApi.onGet('api/universidades').reply(() => {
            return [200, cloneDeep(this._universidades)];
        });

        this.mockApi.onPost('api/universidades').reply(({ request }) => {
            const payload = request.body as {
                nombre: string;
                ciudad?: string | null;
                activo: boolean;
            };

            const now = new Date().toISOString();
            const nextId =
                this._universidades.length > 0
                    ? Math.max(...this._universidades.map((universidad) => universidad.id)) + 1
                    : 1;

            const universidad = {
                id: nextId,
                nombre: payload.nombre,
                ciudad: payload.ciudad ?? null,
                activo: payload.activo,
                fechaRegistro: now,
                fechaActualizacion: now,
                usuaraioRegistroId: null,
                usuaraioActualizacionId: null,
            };

            this._universidades = [universidad, ...this._universidades];

            return [200, cloneDeep(universidad)];
        });

        this.mockApi
            .onPatch('api/universidades/:id')
            .reply(({ request, urlParams }) => {
                const id = Number(urlParams['id']);

                const payload = request.body as {
                    nombre?: string;
                    ciudad?: string | null;
                    activo?: boolean;
                };

                let updatedUniversidad: any = null;

                this._universidades = this._universidades.map((universidad) => {
                    if (universidad.id === id) {
                        updatedUniversidad = assign({}, universidad, payload, {
                            fechaActualizacion: new Date().toISOString(),
                        });
                        return updatedUniversidad;
                    }
                    return universidad;
                });

                if (!updatedUniversidad) {
                    return [404, { message: 'La universidad solicitada no existe.' }];
                }

                return [200, cloneDeep(updatedUniversidad)];
            });
    }
}
