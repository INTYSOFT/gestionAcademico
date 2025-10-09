import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { OidcAuthService, mapClaimsToUserProfile, normalizeRoles } from './oidc-auth.service';
import { UserStore } from '../services/user.store';

class OidcSecurityServiceMock {
  readonly isAuthenticated$ = new BehaviorSubject<boolean>(false);
  readonly userData$ = new BehaviorSubject<unknown>(null);
  authorize = jest.fn();
  checkAuth = jest.fn().mockReturnValue(of({ isAuthenticated: true, accessToken: 'token', userData: mockClaims }));
  logoffAndRevokeTokens = jest.fn().mockReturnValue(of(true));
  getAccessToken = jest.fn().mockReturnValue('token');
  forceRefreshSession = jest
    .fn()
    .mockReturnValue(of({ isAuthenticated: true, accessToken: 'new-token', userData: mockClaims }));
}

const mockClaims = {
  sub: 'user-123',
  email: 'user@example.com',
  name: 'Test User',
  roles: ['admin']
};

describe('OidcAuthService', () => {
  let service: OidcAuthService;
  let oidcMock: OidcSecurityServiceMock;
  let routerNavigate: jest.Mock;

  beforeEach(() => {
    routerNavigate = jest.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        OidcAuthService,
        UserStore,
        { provide: OidcSecurityService, useClass: OidcSecurityServiceMock },
        {
          provide: Router,
          useValue: {
            url: '/dashboard',
            navigate: routerNavigate,
            navigateByUrl: jest.fn()
          }
        }
      ]
    });

    service = TestBed.inject(OidcAuthService);
    oidcMock = TestBed.inject(OidcSecurityService) as unknown as OidcSecurityServiceMock;
  });

  it('should initialize authentication state from OIDC client', async () => {
    await service.initializeAuth();

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('token');
  });

  it('should refresh tokens when refreshSession is called', (done) => {
    service.refreshSession().subscribe((authenticated) => {
      expect(authenticated).toBe(true);
      expect(service.accessToken()).toBe('new-token');
      done();
    });
  });

  it('should perform logout and navigate to sign-in', () => {
    service.logout();

    expect(oidcMock.logoffAndRevokeTokens).toHaveBeenCalled();
    expect(routerNavigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('should map claims to user profile with fallback name', () => {
    const profile = mapClaimsToUserProfile({
      sub: '1',
      email: 'fallback@example.com',
      given_name: 'Fallback',
      family_name: 'User',
      roles: ['manager']
    });

    expect(profile).toEqual(
      expect.objectContaining({
        id: '1',
        name: 'Fallback User',
        email: 'fallback@example.com',
        roles: ['manager']
      })
    );
  });

  it('should normalize roles from comma separated string', () => {
    expect(normalizeRoles('admin')).toEqual(['admin']);
    expect(normalizeRoles(['admin', 'manager'])).toEqual(['admin', 'manager']);
    expect(normalizeRoles(undefined)).toEqual([]);
  });
});
