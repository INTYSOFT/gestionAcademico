import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from 'app/core/config/api.config';
import { HttpErrorService } from 'app/core/services/http-error.service';
import { Colegio } from 'app/core/models/centro-estudios/colegio.model';
import { Observable, catchError, map, throwError } from 'rxjs';
import { CENTRO_ESTUDIOS_API } from './centro-estudios-api.constants';

@Injectable({ providedIn: 'root' })
export class ColegiosService {
    private readonly http = inject(HttpClient);
    private readonly apiConfig = inject(API_CONFIG);
    private readonly errorService = inject(HttpErrorService);

    list(): Observable<Colegio[]> {
        return this.http
            .get<Colegio[]>(this.buildUrl(CENTRO_ESTUDIOS_API.colegios))
            .pipe(
                map((response) => response ?? []),
                catchError((error) =>
                    throwError(() => this.errorService.createError(error))
                )
            );
    }

    private buildUrl(endpoint: string): string {
        const baseUrl = this.apiConfig.baseUrl.replace(/\/$/, '');
        const sanitizedEndpoint = endpoint.replace(/^\/+/, '');
        return `${baseUrl}/${sanitizedEndpoint}`;
    }
}
