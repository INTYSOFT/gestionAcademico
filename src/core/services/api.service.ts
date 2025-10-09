import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = signal(environment.production ? '/api' : 'http://localhost:3000');

  get<T>(endpoint: string) {
    return this.http.get<T>(`${this.baseUrl()}${endpoint}`);
  }
}
