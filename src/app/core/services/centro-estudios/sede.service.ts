import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    CreateSedePayload,
    Sede,
    UpdateSedePayload,
} from 'app/core/models/centro-estudios/sede.model';

@Injectable({ providedIn: 'root' })
export class SedeService extends ApiMainService {
    private readonly resourcePath = 'api/sedes';

    getSedes(): Observable<Sede[]> {
        return this.get<Sede[]>(this.resourcePath);
    }

    createSede(payload: CreateSedePayload): Observable<Sede> {
        return this.post<Sede>(this.resourcePath, payload);
    }

    updateSede(id: number, payload: UpdateSedePayload): Observable<Sede> {
        return this.patch<Sede>(`${this.resourcePath}/${id}`, payload);
    }
}
