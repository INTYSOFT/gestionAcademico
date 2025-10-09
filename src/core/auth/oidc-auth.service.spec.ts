import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { OidcAuthService } from './oidc-auth.service';
import { UserStore } from '../services/user.store';

const REDIRECT_KEY = 'app.oidc.redirect-url';

describe('OidcAuthService', () => {
  let service: OidcAuthService;
  let oidcSecurityService: {
    isAuthenticated$: BehaviorSubject<boolean>;
    idTokenClaims$: BehaviorSubject<Record<string, unknown> | null>;
    authorize: jest.Mock;
    getAccessToken: jest.Mock;
    logoffAndRevokeTokens: jest.Mock;
    forceRefreshSession: jest.Mock;
  };
  let userStore: { setUser: jest.Mock; clear: jest.Mock };
  let router: { navigateByUrl: jest.Mock; url: string };

  beforeEach(() => {
    oidcSecurityService = {
      isAuthenticated$: new BehaviorSubject<boolean>(false),
      idTokenClaims$: new BehaviorSubject<Record<string, unknown> | null>(null),
      authorize: jest.fn(),
      getAccessToken: jest.fn().mockReturnValue('oidc-token'),
      logoffAndRevokeTokens: jest.fn().mockReturnValue(of(void 0)),
      forceRefreshSession: jest.fn().mockReturnValue(of({ isAuthenticated: true }))
    };
    userStore = {
      setUser: jest.fn(),
      clear: jest.fn()
    };
    router = {
      navigateByUrl: jest.fn().mockResolvedValue(true),
      url: '/current'
    };

    TestBed.configureTestingModule({
      providers: [
        OidcAuthService,
        { provide: OidcSecurityService, useValue: oidcSecurityService },
        { provide: UserStore, useValue: userStore },
        { provide: Router, useValue: router }
      ]
    });

    service = TestBed.inject(OidcAuthService);
    window.sessionStorage.removeItem(REDIRECT_KEY);
  });

  it('persists redirect and triggers authorize on login', () => {
    service.login('/reports');

    expect(window.sessionStorage.getItem(REDIRECT_KEY)).toBe('/reports');
    expect(oidcSecurityService.authorize).toHaveBeenCalled();
  });

  it('maps claims to user and stores it', async () => {
    oidcSecurityService.idTokenClaims$.next({
      sub: '123',
      email: 'user@example.com',
      name: 'Test User',
      roles: ['admin']
    });
    oidcSecurityService.isAuthenticated$.next(true);

    const user = await firstValueFrom(service.user$.pipe(filter((value): value is NonNullable<typeof value> => value !== null)));
    expect(user.id).toBe('123');
    expect(user.roles).toEqual(['admin']);
    expect(userStore.setUser).toHaveBeenCalledWith(expect.objectContaining({ id: '123' }));
  });

  it('supports manual callback completion with custom tokens', async () => {
    await service.completeWithManualUser({
      user: {
        id: 'manual',
        name: 'Manual User',
        email: 'manual@example.com',
        roles: ['manager']
      },
      accessToken: 'manual-token',
      redirectUrl: '/dashboard'
    });

    const isAuthenticated = await firstValueFrom(service.isAuthenticated().pipe(filter((value) => value)));
    expect(isAuthenticated).toBe(true);
    expect(service.accessToken()).toBe('manual-token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('clears overrides on logout', async () => {
    await service.completeWithManualUser({
      user: {
        id: 'manual-2',
        name: 'Manual Two',
        email: 'manual2@example.com',
        roles: ['admin']
      },
      accessToken: 'manual-token'
    });

    service.logout();

    expect(service.accessToken()).toBe('oidc-token');
    expect(userStore.clear).toHaveBeenCalled();
  });

  it('falls back to null token when oidc client throws', () => {
    oidcSecurityService.getAccessToken.mockImplementation(() => {
      throw new Error('access denied');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(service.accessToken()).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
