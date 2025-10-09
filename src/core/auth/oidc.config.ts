import { APP_INITIALIZER, Provider } from '@angular/core';
import { LogLevel, OidcSecurityService, provideAuth } from 'angular-auth-oidc-client';
import { firstValueFrom, of, from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { OidcAuthService } from './oidc-auth.service';

class InMemoryAuthStorage implements Storage {
  private readonly storage = new Map<string, string>();

  get length(): number {
    return this.storage.size;
  }

  clear(): void {
    this.storage.clear();
  }

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.storage.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }
}

function createStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return new InMemoryAuthStorage();
  }

  if (environment.oidc.persistTokensInSessionStorage) {
    return window.sessionStorage;
  }

  return new InMemoryAuthStorage();
}

export function provideOidcConfig(): Provider[] {
  const storage = createStorage();

  return [
    provideAuth({
      config: {
        authority: environment.oidc.authority,
        clientId: environment.oidc.clientId,
        redirectUrl: environment.oidc.redirectUrl,
        postLogoutRedirectUri: environment.oidc.postLogoutRedirectUri,
        responseType: environment.oidc.responseType,
        scope: environment.oidc.scope,
        useRefreshToken: environment.oidc.useRefreshToken,
        renewTimeBeforeTokenExpiresInSeconds: environment.oidc.renewTimeBeforeTokenExpiresInSeconds,
        secureRoutes: environment.oidc.secureRoutes,
        customParamsAuthRequest: environment.oidc.customParamsAuthRequest,
        silentRenew: true,
        ignoreNonceAfterRefresh: true,
        logLevel: environment.production ? LogLevel.None : LogLevel.Debug,
        storage
      }
    }),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (authService: OidcAuthService, oidcSecurityService: OidcSecurityService) => () =>
        firstValueFrom(
          oidcSecurityService
            .checkAuth()
            .pipe(
              switchMap((result) => from(authService.handleInitialSignIn(result))),
              catchError((error) => {
                if (!environment.production) {
                  console.error('OIDC checkAuth failed', error);
                }
                return of(void 0);
              })
            )
        ).then(() => void 0),
      deps: [OidcAuthService, OidcSecurityService]
    }
  ];
}
