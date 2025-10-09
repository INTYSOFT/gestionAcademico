import { APP_INITIALIZER, EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { LogLevel, OpenIdConfiguration, StoragePersistence, provideAuth } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment';
import { OidcAuthService } from './oidc-auth.service';

export function initializeOidcFactory(oidcAuthService: OidcAuthService) {
  return () => oidcAuthService.initializeAuth();
}

export function provideOidc(): EnvironmentProviders {
  const config: OpenIdConfiguration = {
    authority: environment.oidc.authority,
    clientId: environment.oidc.clientId,
    redirectUrl: environment.oidc.redirectUrl,
    postLogoutRedirectUri: environment.oidc.postLogoutRedirectUri,
    responseType: environment.oidc.responseType,
    scope: environment.oidc.scope,
    useRefreshToken: environment.oidc.useRefreshToken,
    renewTimeBeforeTokenExpiresInSeconds: environment.oidc.renewTimeBeforeTokenExpiresInSeconds,
    secureRoutes: environment.oidc.secureRoutes,
    logLevel: environment.production ? LogLevel.Error : LogLevel.Debug,
    storageType: environment.oidc.persistTokens
      ? StoragePersistence.SessionStorage
      : StoragePersistence.InMemory,
    autoUserInfo: false,
    useRefreshTokenInSilentRenew: true
  };

  if (environment.oidc.customParamsAuthRequest) {
    config.customParamsAuthRequest = environment.oidc.customParamsAuthRequest;
  }

  return makeEnvironmentProviders([
    provideAuth({
      config
    }),
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: initializeOidcFactory,
      deps: [OidcAuthService]
    }
  ]);
}
