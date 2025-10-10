import { InjectionToken } from '@angular/core';

export interface ApiConfig {
    baseUrl: string;
    retryAttempts: number;
    defaultHeaders?: Record<string, string>;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export function provideApiConfig(config: ApiConfig) {
    return {
        provide: API_CONFIG,
        useValue: config,
    } as const;
}
