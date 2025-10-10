import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { Apoderado, UpsertApoderadoPayload } from 'app/core/models/centro-estudios/apoderado.model';

@Injectable({ providedIn: 'root' })
export class ApoderadoService extends ApiMainService {
    private readonly resourcePath = 'api/Apoderadoes';

    getApoderados(search?: string): Observable<Apoderado[]> {
        const params = search ? { search } : undefined;
        return this.get<Apoderado[]>(this.resourcePath, { params });
    }

    getApoderadoById(id: number): Observable<Apoderado> {
        return this.get<Apoderado>(`${this.resourcePath}/${id}`);
    }

    createApoderado(payload: UpsertApoderadoPayload): Observable<Apoderado> {
        return this.post<Apoderado>(this.resourcePath, payload);
    }

    updateApoderado(id: number, payload: UpsertApoderadoPayload): Observable<Apoderado> {
        const body: UpsertApoderadoPayload = {
            ...payload,
            id,
        };

        return this.patch<Apoderado>(`${this.resourcePath}/${id}`, body);
    }
}
