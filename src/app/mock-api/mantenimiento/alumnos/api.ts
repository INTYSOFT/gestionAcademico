import { Injectable } from '@angular/core';
import { FuseMockApiService } from '@fuse/lib/mock-api';
import { assign, cloneDeep } from 'lodash-es';
import {
    Alumno,
    CreateAlumnoPayload,
    UpdateAlumnoPayload,
} from 'app/core/models/centro-estudios/alumno.model';
import { alumnosData } from './data';

@Injectable({ providedIn: 'root' })
export class AlumnosMockApi {
    private _alumnos = cloneDeep(alumnosData);

    constructor(private readonly mockApi: FuseMockApiService) {
        this.registerHandlers();
    }

    registerHandlers(): void {
        const endpoints = [
            'api/Alumnoes',
            'http://192.168.1.50:5000/api/Alumnoes',
        ];

        endpoints.forEach((endpoint) => this.registerAlumnoHandlers(endpoint));
    }

    private registerAlumnoHandlers(endpoint: string): void {
        this.mockApi.onGet(endpoint).reply(() => {
            return [200, cloneDeep(this._alumnos)];
        });

        this.mockApi.onGet(`${endpoint}/:id`).reply(({ urlParams }) => {
            const id = Number(urlParams['id']);
            const alumno = this._alumnos.find((item) => item.id === id);

            if (!alumno) {
                return [404, { message: 'El alumno solicitado no existe.' }];
            }

            return [200, cloneDeep(alumno)];
        });

        this.mockApi.onPost(endpoint).reply(({ request }) => {
            const payload = request.body as CreateAlumnoPayload;
            const now = new Date().toISOString();
            const nextId =
                this._alumnos.length > 0
                    ? Math.max(...this._alumnos.map((alumno) => alumno.id)) + 1
                    : 1;

            const alumno: Alumno = {
                id: nextId,
                dni: payload.dni,
                apellidos: payload.apellidos,
                nombres: payload.nombres,
                fechaNacimiento: payload.fechaNacimiento ?? null,
                celular: payload.celular ?? null,
                correo: payload.correo ?? null,
                ubigeoCode: null,
                colegioOrigen: null,
                direccion: payload.direccion ?? null,
                observacion: payload.observacion ?? null,
                fotoUrl: null,
                activo: payload.activo,
                fechaRegistro: now,
                fechaActualizacion: now,
                usuaraioRegistroId: null,
                usuaraioActualizacionId: null,
                colegioId: payload.colegioId,
            };

            this._alumnos = [alumno, ...this._alumnos];

            return [200, cloneDeep(alumno)];
        });

        this.mockApi
            .onPatch(`${endpoint}/:id`)
            .reply(({ request, urlParams }) => {
                const id = Number(urlParams['id']);
                const payload = request.body as UpdateAlumnoPayload;
                let updatedAlumno: Alumno | null = null;

                this._alumnos = this._alumnos.map((alumno) => {
                    if (alumno.id === id) {
                        updatedAlumno = assign({}, alumno, payload, {
                            fechaActualizacion: new Date().toISOString(),
                        });

                        return updatedAlumno;
                    }

                    return alumno;
                });

                if (!updatedAlumno) {
                    return [404, { message: 'El alumno solicitado no existe.' }];
                }

                return [200, cloneDeep(updatedAlumno)];
            });

        this.mockApi
            .onDelete(`${endpoint}/:id`)
            .reply(({ urlParams }) => {
                const id = Number(urlParams['id']);
                const index = this._alumnos.findIndex((alumno) => alumno.id === id);

                if (index === -1) {
                    return [404, { message: 'El alumno solicitado no existe.' }];
                }

                this._alumnos.splice(index, 1);

                return [204, null];
            });
    }
}
