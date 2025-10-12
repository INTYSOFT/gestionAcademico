import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
    Colegio,
    CreateColegioPayload,
    UpdateColegioPayload,
} from 'app/core/models/centro-estudios/colegio.model';
import { ApiMainService } from '../api/api-main.service';

@Injectable({ providedIn: 'root' })
export class ColegiosService extends ApiMainService {
    private readonly resourcePath = 'api/Colegios';

    list(): Observable<Colegio[]> {
        return this.getColegios();
    }

    getColegios(): Observable<Colegio[]> {
        return this.get<Colegio[]>(this.resourcePath);
    }

    createColegio(payload: CreateColegioPayload): Observable<Colegio> {
        return this.post<Colegio>(this.resourcePath, payload);
    }

    updateColegio(id: number, payload: UpdateColegioPayload): Observable<Colegio> {
        const body: UpdateColegioPayload = {
            ...payload,
            id,
        };

        return this.patch<Colegio>(`${this.resourcePath}/${id}`, body);
    }
}
