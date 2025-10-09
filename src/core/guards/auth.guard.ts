import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { OidcAuthService } from '../auth/oidc-auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(OidcAuthService);

  if (authService.isAuthenticated()) {
    return true;
  }

  authService.login(state.url);
  return false;
};
