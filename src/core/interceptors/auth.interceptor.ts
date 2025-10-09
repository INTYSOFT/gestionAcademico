import { HttpInterceptorFn } from '@angular/common/http';
import { HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { OidcAuthService } from '../auth/oidc-auth.service';

export const RETRY_REQUEST_CONTEXT = new HttpContextToken<boolean>(() => false);

function isSecureRoute(url: string): boolean {
  return environment.oidc.secureRoutes.some((route) => url.startsWith(route));
}

function isIdentityProviderRequest(url: string): boolean {
  try {
    const authority = new URL(environment.oidc.authority);
    const target = new URL(url);
    return authority.origin === target.origin;
  } catch {
    return false;
  }
}

export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isSecureRoute(req.url) || isIdentityProviderRequest(req.url)) {
    return next(req);
  }

  const authService = inject(OidcAuthService);
  const accessToken = authService.accessToken();

  if (!accessToken) {
    return next(req);
  }

  const authRequest = req.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` }
  });

  return next(authRequest);
};
