import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Route, UrlSegment } from '@angular/router';
import { map, take, tap } from 'rxjs/operators';
import { OidcAuthService } from '../auth/oidc-auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(OidcAuthService);

  return authService.isAuthenticated().pipe(
    take(1),
    tap((isAuthenticated) => {
      if (!isAuthenticated) {
        authService.login(state.url);
      }
    }),
    map((isAuthenticated) => isAuthenticated)
  );
};

export const authenticatedRedirectGuard: CanMatchFn = (
  _route: Route,
  _segments: UrlSegment[]
) => {
  const authService = inject(OidcAuthService);
  return authService.isAuthenticated().pipe(take(1));
};
