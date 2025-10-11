import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    Apoderado,
    CreateApoderadoPayload,
    UpdateApoderadoPayload,
} from 'app/core/models/centro-estudios/apoderado.model';

@Injectable({ providedIn: 'root' })
export class ApoderadoService extends ApiMainService {
    private readonly resourcePath = 'api/apoderados';

    getApoderados(): Observable<Apoderado[]> {
        return this.get<Apoderado[]>(this.resourcePath);
    }

    createApoderado(payload: CreateApoderadoPayload): Observable<Apoderado> {
        return this.post<Apoderado>(this.resourcePath, payload);
    }

    updateApoderado(id: number, payload: UpdateApoderadoPayload): Observable<Apoderado> {
        return this.patch<Apoderado>(`${this.resourcePath}/${id}`, payload);
    }
}
