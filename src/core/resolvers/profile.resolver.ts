import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, filter, map, of, switchMap, take, tap } from 'rxjs';
import { UserStore } from '../services/user.store';
import { OidcAuthService, mapClaimsToUserProfile } from '../auth/oidc-auth.service';
import { ApiService } from '../services/api.service';
import { UserProfile } from '../models/user';

export const profileResolver: ResolveFn<UserProfile | null> = () => {
  const userStore = inject(UserStore);
  const authService = inject(OidcAuthService);
  const apiService = inject(ApiService);

  const existingProfile = userStore.profile();
  if (existingProfile) {
    return existingProfile;
  }

  if (!authService.isAuthenticated()) {
    return null;
  }

  return authService.idTokenClaims$.pipe(
    filter((claims): claims is Record<string, unknown> => !!claims),
    take(1),
    switchMap((claims) => {
      if (claims) {
        const profileFromClaims = mapClaimsToUserProfile(claims as Record<string, unknown>);
        if (profileFromClaims) {
          userStore.setUser(profileFromClaims);
        }
      }

      return apiService.get<UserProfile>('/me').pipe(
        tap((apiProfile) => {
          const mergedProfile = mergeProfiles(userStore.profile(), apiProfile);
          userStore.setUser(mergedProfile);
        }),
        map(() => userStore.profile()),
        catchError(() => of(userStore.profile()))
      );
    })
  );
};

function mergeProfiles(claimsProfile: UserProfile | null, apiProfile: UserProfile): UserProfile {
  return {
    id: apiProfile.id || claimsProfile?.id || '',
    name: apiProfile.name || claimsProfile?.name || '',
    email: apiProfile.email || claimsProfile?.email || '',
    picture: apiProfile.picture || claimsProfile?.picture,
    roles: Array.from(new Set([...(claimsProfile?.roles ?? []), ...(apiProfile.roles ?? [])]))
  };
}
