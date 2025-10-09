import { DestroyRef, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, firstValueFrom, map, of, tap, throwError } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment';
import { UserStore } from '../services/user.store';
import { UserProfile } from '../models/user';

const REDIRECT_STORAGE_KEY = 'gestion-academico:auth:redirect';

export interface MockAuthPayload {
  id: string;
  name: string;
  email: string;
  roles: string[];
  accessToken?: string;
  redirectUri?: string;
  picture?: string;
}

@Injectable({ providedIn: 'root' })
export class OidcAuthService {
  private readonly oidcSecurityService = inject(OidcSecurityService);
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly accessTokenSubject = new BehaviorSubject<string | null>(null);
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly idTokenClaimsSubject = new BehaviorSubject<Record<string, unknown> | null>(null);

  readonly user$ = toObservable(this.userStore.user);
  readonly roles$ = toObservable(this.userStore.roles);
  readonly idTokenClaims$ = this.idTokenClaimsSubject.asObservable();
  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.oidcSecurityService.isAuthenticated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((auth) => this.isAuthenticatedSubject.next(auth));

    this.oidcSecurityService.userData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((userDataResult) => {
        const claims = extractClaims(userDataResult);
        this.syncUserFromClaims(claims);
      });
  }

  async initializeAuth(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.oidcSecurityService.checkAuth().pipe(
          tap((loginState) => {
            if (loginState?.accessToken) {
              this.accessTokenSubject.next(loginState.accessToken);
            }
            if (loginState?.userData) {
              this.syncUserFromClaims(loginState.userData as Record<string, unknown>);
            }
            if (loginState?.isAuthenticated) {
              this.updateAccessToken();
            }
          })
        )
      );

      this.isAuthenticatedSubject.next(result?.isAuthenticated ?? false);
      await this.navigatePostLogin();
    } catch (error) {
      console.error('Error during OIDC initialization', error);
      this.isAuthenticatedSubject.next(false);
      this.accessTokenSubject.next(null);
      this.userStore.clear();
      this.idTokenClaimsSubject.next(null);
    }
  }

  login(redirectTo?: string): void {
    const target = redirectTo ?? this.router.url;
    this.getStorage()?.setItem(REDIRECT_STORAGE_KEY, target);
    this.oidcSecurityService.authorize();
  }

  logout(): void {
    this.getStorage()?.removeItem(REDIRECT_STORAGE_KEY);
    this.accessTokenSubject.next(null);
    this.userStore.clear();
    this.isAuthenticatedSubject.next(false);
    this.idTokenClaimsSubject.next(null);
    this.oidcSecurityService.logoffAndRevokeTokens().subscribe({
      error: (error) => console.error('Error during logout', error)
    });
    void this.router.navigate(['/sign-in']);
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.getValue();
  }

  accessToken(): string | null {
    return this.accessTokenSubject.getValue();
  }

  refreshSession(): Observable<boolean> {
    if (!environment.oidc.useRefreshToken) {
      return of(false);
    }

    return this.oidcSecurityService.forceRefreshSession().pipe(
      tap((result) => {
        if (result?.accessToken) {
          this.accessTokenSubject.next(result.accessToken);
        }
        if (result?.userData) {
          this.syncUserFromClaims(result.userData as Record<string, unknown>);
        }
      }),
      map((result) => result?.isAuthenticated ?? false),
      catchError((error) => {
        this.accessTokenSubject.next(null);
        return throwError(() => error);
      })
    );
  }

  mockCompleteLogin(payload: MockAuthPayload): void {
    if (environment.production || !environment.mockAuth) {
      return;
    }

    const profile: UserProfile = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
      picture: payload.picture
    };

    this.accessTokenSubject.next(payload.accessToken ?? 'mock-access-token');
    this.idTokenClaimsSubject.next({
      sub: payload.id,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      [environment.oidc.roleClaim]: payload.roles
    });
    this.userStore.setUser(profile);
    this.isAuthenticatedSubject.next(true);
    void this.router.navigateByUrl(payload.redirectUri ?? '/dashboard');
  }

  private async navigatePostLogin(): Promise<void> {
    const redirect = this.getStorage()?.getItem(REDIRECT_STORAGE_KEY);
    if (!redirect || !this.isAuthenticated()) {
      return;
    }

    this.getStorage()?.removeItem(REDIRECT_STORAGE_KEY);
    await this.router.navigateByUrl(redirect);
  }

  private updateAccessToken(): void {
    const token = this.oidcSecurityService.getAccessToken();
    this.accessTokenSubject.next(token || null);
  }

  private syncUserFromClaims(claims: Record<string, unknown>): void {
    if (!claims) {
      return;
    }

    this.idTokenClaimsSubject.next(claims);
    const profile = mapClaimsToUserProfile(claims);
    if (profile) {
      this.userStore.setUser(profile);
    }
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage;
  }
}

export function mapClaimsToUserProfile(claims: Record<string, unknown>): UserProfile | null {
  const id = readClaim(claims, 'sub');
  const email = readClaim(claims, 'email');
  const givenName = readClaim(claims, 'given_name');
  const familyName = readClaim(claims, 'family_name');
  const name = readClaim(claims, 'name') || [givenName, familyName].filter(Boolean).join(' ').trim();
  const picture = readClaim(claims, 'picture');
  const rolesClaim = readClaim(claims, environment.oidc.roleClaim);
  const roles = normalizeRoles(rolesClaim);

  if (!id) {
    return null;
  }

  return {
    id: String(id),
    name: name ? String(name) : String(email ?? id),
    email: email ? String(email) : '',
    roles,
    picture: typeof picture === 'string' ? picture : undefined
  };
}

function extractClaims(userDataResult: unknown): Record<string, unknown> {
  if (!userDataResult || typeof userDataResult !== 'object') {
    return {};
  }

  const typed = userDataResult as { userData?: unknown; claims?: unknown; decodedIdToken?: unknown };
  const claims = (typed.userData ?? typed.claims ?? typed.decodedIdToken ?? userDataResult) as Record<string, unknown>;
  return claims ?? {};
}

export function normalizeRoles(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((role) => String(role)).filter(Boolean);
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

function readClaim(claims: Record<string, unknown>, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(claims, key) ? claims[key] : undefined;
}
