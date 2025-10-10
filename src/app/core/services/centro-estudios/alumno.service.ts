import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { Alumno, CreateAlumnoPayload, UpdateAlumnoPayload } from 'app/core/models/centro-estudios/alumno.model';

@Injectable({ providedIn: 'root' })
export class AlumnoService extends ApiMainService {
    private readonly resourcePath = 'api/Alumnoes';

    getAlumnos(search?: string): Observable<Alumno[]> {
        const params = search ? { search } : undefined;
        return this.get<Alumno[]>(this.resourcePath, { params });
    }

    createAlumno(payload: CreateAlumnoPayload): Observable<Alumno> {
        return this.post<Alumno>(this.resourcePath, payload);
    }

    updateAlumno(id: number, payload: UpdateAlumnoPayload): Observable<Alumno> {
        const body: UpdateAlumnoPayload = {
            ...payload,
            id,
        };

        return this.patch<Alumno>(`${this.resourcePath}/${id}`, body);
    }
}
