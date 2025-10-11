import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { Alumno, CreateAlumnoPayload, UpdateAlumnoPayload } from 'app/core/models/centro-estudios/alumno.model';

@Injectable({ providedIn: 'root' })
export class AlumnosService extends ApiMainService {
    private readonly resourcePath = 'api/alumnos';

    getAlumnos(): Observable<Alumno[]> {
        return this.get<Alumno[]>(this.resourcePath);
    }

    createAlumno(payload: CreateAlumnoPayload): Observable<Alumno> {
        return this.post<Alumno>(this.resourcePath, payload);
    }

    updateAlumno(id: number, payload: UpdateAlumnoPayload): Observable<Alumno> {
        return this.patch<Alumno>(`${this.resourcePath}/${id}`, payload);
    }
}
