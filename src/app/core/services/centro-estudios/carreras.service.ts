import { Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    Carrera,
    CreateCarreraPayload,
    UpdateCarreraPayload,
} from 'app/core/models/centro-estudios/carrera.model';

@Injectable({ providedIn: 'root' })
export class CarrerasService extends ApiMainService {
    private readonly resourcePath = 'api/Carreras';

    list(): Observable<Carrera[]> {
        return this.get<Carrera[]>(this.resourcePath);
    }

    getCarrera(id: number): Observable<Carrera> {
        return this.get<Carrera>(`${this.resourcePath}/${id}`);
    }

    createCarrera(payload: CreateCarreraPayload): Observable<Carrera> {
        return this.post<Carrera>(this.resourcePath, payload);
    }

    updateCarrera(id: number, payload: UpdateCarreraPayload): Observable<Carrera> {
        const body: UpdateCarreraPayload & { id: number } = {
            ...payload,
            id,
        };

        return this.patch<unknown>(`${this.resourcePath}/${id}`, body).pipe(
            switchMap(() => this.getCarrera(id))
        );
    }
}
