import { DestroyRef, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, combineLatest, firstValueFrom } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';
import { UserStore } from '../services/user.store';
import { User } from '../models/user';

export interface AuthResult {
  isAuthenticated: boolean;
  idToken?: string;
  accessToken?: string;
  userData?: unknown;
  idTokenClaims?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class OidcAuthService {
  private static readonly REDIRECT_KEY = 'app.oidc.redirect-url';

  private readonly router = inject(Router);
  private readonly oidcSecurityService = inject(OidcSecurityService);
  private readonly userStore = inject(UserStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isAuthenticatedInternal$ = this.oidcSecurityService.isAuthenticated$.pipe(
    map((value) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (value && typeof value === 'object' && 'isAuthenticated' in value) {
        return Boolean((value as { isAuthenticated?: unknown }).isAuthenticated);
      }
      return false;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly idTokenClaims$ = this.oidcSecurityService.idTokenClaims$.pipe(
    map((claims) => (claims ?? {}) as Record<string, unknown>),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly user$ = combineLatest([this.idTokenClaims$, this.isAuthenticatedInternal$]).pipe(
    map(([claims, isAuthenticated]) => (isAuthenticated ? this.mapClaimsToUser(claims) : null)),
    tap((user) => {
      if (user) {
        this.userStore.setUser(user);
      } else {
        this.userStore.clear();
      }
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedInternal$;
  }

  login(redirectTo?: string): void {
    const targetUrl = redirectTo || this.router.url;
    this.setRedirectUrl(targetUrl);
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    this.clearRedirectUrl();
    this.userStore.clear();
    void firstValueFrom(this.oidcSecurityService.logoffAndRevokeTokens()).catch(() => undefined);
  }

  accessToken(): string | null {
    try {
      return this.oidcSecurityService.getAccessToken();
    } catch (error) {
      console.error('Error retrieving access token', error);
      return null;
    }
  }

  refreshSession(): Observable<AuthResult> {
    return this.oidcSecurityService.forceRefreshSession().pipe(
      tap((result: AuthResult) => {
        if (!result?.isAuthenticated) {
          this.userStore.clear();
        }
      })
    );
  }

  async handleInitialSignIn(result: AuthResult | null): Promise<void> {
    if (!result) {
      this.userStore.clear();
      return;
    }

    if (!result.isAuthenticated) {
      this.userStore.clear();
      this.clearRedirectUrl();
      return;
    }

    const redirectUrl = this.consumeRedirectUrl();
    if (redirectUrl) {
      await this.router.navigateByUrl(redirectUrl);
    }
  }

  private mapClaimsToUser(claims: Record<string, unknown>): User | null {
    const subject = this.getStringClaim(claims, 'sub');
    if (!subject) {
      return null;
    }

    const email = this.getStringClaim(claims, 'email');
    const givenName = this.getStringClaim(claims, 'given_name');
    const familyName = this.getStringClaim(claims, 'family_name');
    const fullName =
      this.getStringClaim(claims, 'name') ||
      [givenName, familyName].filter((part) => !!part).join(' ').trim() ||
      email ||
      subject;
    const picture = this.getStringClaim(claims, 'picture');
    const roleClaim = environment.oidc.roleClaim;
    const roles = this.getRolesFromClaim(claims[roleClaim]);

    return {
      id: subject,
      name: fullName,
      email: email ?? `${subject}@placeholder.local`,
      roles,
      avatarUrl: picture || undefined
    };
  }

  private getRolesFromClaim(claimValue: unknown): string[] {
    if (!claimValue) {
      return [];
    }
    if (Array.isArray(claimValue)) {
      return claimValue.filter((value): value is string => typeof value === 'string');
    }
    if (typeof claimValue === 'string') {
      return claimValue.split(',').map((role) => role.trim()).filter((role) => !!role);
    }
    return [];
  }

  private getStringClaim(claims: Record<string, unknown>, key: string): string | null {
    const value = claims[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private setRedirectUrl(url: string | null | undefined): void {
    if (!url) {
      return;
    }
    const storage = this.getBrowserStorage();
    storage?.setItem(OidcAuthService.REDIRECT_KEY, url);
  }

  private consumeRedirectUrl(): string | null {
    const storage = this.getBrowserStorage();
    if (!storage) {
      return null;
    }
    const url = storage.getItem(OidcAuthService.REDIRECT_KEY);
    if (url) {
      storage.removeItem(OidcAuthService.REDIRECT_KEY);
    }
    return url;
  }

  private clearRedirectUrl(): void {
    const storage = this.getBrowserStorage();
    storage?.removeItem(OidcAuthService.REDIRECT_KEY);
  }

  private getBrowserStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.sessionStorage;
  }
}
