import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateUniversidadPayload,
    Universidad,
    UpdateUniversidadPayload,
} from 'app/core/models/centro-estudios/universidad.model';

@Injectable({ providedIn: 'root' })
export class UniversidadService extends ApiMainService {
    private readonly resourcePath = 'api/Universidads';

    getUniversidades(): Observable<Universidad[]> {
        return this.get<Universidad[]>(this.resourcePath);
    }

    createUniversidad(payload: CreateUniversidadPayload): Observable<Universidad> {
        return this.post<Universidad>(this.resourcePath, payload);
    }

    updateUniversidad(id: number, payload: UpdateUniversidadPayload): Observable<Universidad> {
        const body: Record<string, unknown> = {
            Id: id,
        };

        if ('nombre' in payload) {
            body['Nombre'] = payload.nombre;
        }

        if ('ciudad' in payload) {
            body['Ciudad'] = payload.ciudad ?? null;
        }

        if ('activo' in payload) {
            body['Activo'] = payload.activo;
        }

        return this.patch<Universidad>(`${this.resourcePath}/${id}`, body);
    }
}
