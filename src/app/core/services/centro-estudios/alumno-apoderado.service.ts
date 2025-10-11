import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import {
    AlumnoApoderado,
    CreateAlumnoApoderadoPayload,
    UpdateAlumnoApoderadoPayload,
} from 'app/core/models/centro-estudios/alumno-apoderado.model';

@Injectable({ providedIn: 'root' })
export class AlumnoApoderadoService extends ApiMainService {
    private readonly resourcePath = 'api/alumnos';

    obtenerPorAlumno(alumnoId: number): Observable<AlumnoApoderado[]> {
        return this.get<AlumnoApoderado[]>(`${this.resourcePath}/${alumnoId}/apoderados`);
    }

    crearRelacion(alumnoId: number, payload: CreateAlumnoApoderadoPayload): Observable<AlumnoApoderado> {
        return this.post<AlumnoApoderado>(`${this.resourcePath}/${alumnoId}/apoderados`, payload);
    }

    updateRelacion(
        alumnoId: number,
        relacionId: number,
        payload: UpdateAlumnoApoderadoPayload
    ): Observable<AlumnoApoderado> {
        return this.patch<AlumnoApoderado>(`${this.resourcePath}/${alumnoId}/apoderados/${relacionId}`, payload);
    }

    desvincular(alumnoId: number, relacionId: number): Observable<void> {
        return this.patch<void>(`${this.resourcePath}/${alumnoId}/apoderados/${relacionId}`, { activo: false });
    }
}
