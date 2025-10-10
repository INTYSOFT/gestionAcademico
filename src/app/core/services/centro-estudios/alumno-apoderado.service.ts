import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiMainService } from '../api/api-main.service';
import { AlumnoApoderado } from 'app/core/models/centro-estudios/alumno-apoderado.model';

@Injectable({ providedIn: 'root' })
export class AlumnoApoderadoService extends ApiMainService {
    private readonly resourcePath = 'api/alumno-apoderados';

    getByAlumnoId(alumnoId: number): Observable<AlumnoApoderado[]> {
        return this.get<AlumnoApoderado[]>(this.resourcePath, {
            params: { alumnoId: String(alumnoId) },
        });
    }
}
