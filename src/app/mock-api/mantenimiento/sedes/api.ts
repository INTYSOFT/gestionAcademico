import { Injectable } from '@angular/core';
import { FuseMockApiService, FuseMockApiUtils } from '@fuse/lib/mock-api';
import { assign, cloneDeep } from 'lodash-es';
import { sedesData } from './data';

@Injectable({ providedIn: 'root' })
export class SedesMockApi {
    private _sedes = cloneDeep(sedesData);

    constructor(private readonly mockApi: FuseMockApiService) {
        this.registerHandlers();
    }

    registerHandlers(): void {
        this.mockApi.onGet('api/centro-estudios/sedes').reply(() => {
            return [200, cloneDeep(this._sedes)];
        });

        this.mockApi.onPost('api/centro-estudios/sedes').reply(({ request }) => {
            const payload = request.body as {
                nombre: string;
                ubigeoCode: string;
                direccion?: string | null;
            };

            const sede = {
                id: FuseMockApiUtils.guid(),
                nombre: payload.nombre,
                ubigeoCode: payload.ubigeoCode,
                direccion: payload.direccion ?? null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
            };

            this._sedes = [sede, ...this._sedes];

            return [200, cloneDeep(sede)];
        });

        this.mockApi
            .onPatch('api/centro-estudios/sedes/:id')
            .reply(({ request, urlParams }) => {
                const id = urlParams['id'];

                const payload = request.body as {
                    nombre?: string;
                    ubigeoCode?: string;
                    direccion?: string | null;
                };

                let updatedSede: any = null;

                this._sedes = this._sedes.map((sede) => {
                    if (sede.id === id) {
                        updatedSede = assign({}, sede, payload, {
                            updatedAt: new Date().toISOString(),
                        });
                        return updatedSede;
                    }
                    return sede;
                });

                if (!updatedSede) {
                    return [404, { message: 'La sede solicitada no existe.' }];
                }

                return [200, cloneDeep(updatedSede)];
            });
    }
}
