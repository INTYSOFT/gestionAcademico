import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OidcAuthService } from '../auth/oidc-auth.service';
import { environment } from '../../environments/environment';

const identityProviderOrigin = getOrigin(environment.oidc.authority);

export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(OidcAuthService);

  if (isIdentityProviderRequest(req.url) || !isSecureRoute(req.url)) {
    return next(req);
  }

  const token = authService.accessToken();
  if (!token) {
    return next(req);
  }

  const authorizedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authorizedRequest);
};

function isSecureRoute(url: string): boolean {
  return environment.oidc.secureRoutes.some((route) => url.startsWith(route));
}

function isIdentityProviderRequest(url: string): boolean {
  const origin = getOrigin(url);
  return !!origin && !!identityProviderOrigin && origin === identityProviderOrigin;
}

function getOrigin(url: string): string | null {
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : environment.oidc.redirectUrl;
    const parsed = new URL(url, base);
    return parsed.origin;
  } catch {
    return null;
  }
}
