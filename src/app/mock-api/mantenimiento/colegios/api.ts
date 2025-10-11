import { Injectable } from '@angular/core';
import { FuseMockApiService } from '@fuse/lib/mock-api';
import { assign, cloneDeep } from 'lodash-es';
import { colegiosData } from './data';

@Injectable({ providedIn: 'root' })
export class ColegiosMockApi {
    private _colegios = cloneDeep(colegiosData);

    constructor(private readonly mockApi: FuseMockApiService) {
        this.registerHandlers();
    }

    registerHandlers(): void {
        this.mockApi.onGet('api/centro-estudios/colegios').reply(() => {
            return [200, cloneDeep(this._colegios)];
        });

        this.mockApi.onPost('api/centro-estudios/colegios').reply(({ request }) => {
            const payload = request.body as {
                nombre: string;
                ubigeoCode?: string | null;
                esPrivado?: boolean | null;
                activo: boolean;
            };

            const now = new Date().toISOString();
            const nextId =
                this._colegios.length > 0
                    ? Math.max(...this._colegios.map((colegio) => colegio.id)) + 1
                    : 1;

            const colegio = {
                id: nextId,
                nombre: payload.nombre,
                ubigeoCode: payload.ubigeoCode ?? null,
                esPrivado: payload.esPrivado ?? null,
                activo: payload.activo,
                fechaRegistro: now,
                fechaActualizacion: now,
                usuaraioRegistroId: null,
                usuaraioActualizacionId: null,
            };

            this._colegios = [colegio, ...this._colegios];

            return [200, cloneDeep(colegio)];
        });

        this.mockApi
            .onPatch('api/centro-estudios/colegios/:id')
            .reply(({ request, urlParams }) => {
                const id = Number(urlParams['id']);

                const payload = request.body as {
                    nombre?: string;
                    ubigeoCode?: string | null;
                    esPrivado?: boolean | null;
                    activo?: boolean;
                };

                let updatedColegio: any = null;

                this._colegios = this._colegios.map((colegio) => {
                    if (colegio.id === id) {
                        updatedColegio = assign({}, colegio, payload, {
                            fechaActualizacion: new Date().toISOString(),
                        });
                        return updatedColegio;
                    }
                    return colegio;
                });

                if (!updatedColegio) {
                    return [404, { message: 'El colegio solicitado no existe.' }];
                }

                return [200, cloneDeep(updatedColegio)];
            });
    }
}
