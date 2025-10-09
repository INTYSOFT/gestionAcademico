import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { OidcAuthService } from '../auth/oidc-auth.service';
import { UserStore } from '../services/user.store';
import { ApiService } from '../services/api.service';
import { User } from '../models/user';

function mergeProfileData(base: User, profile: Partial<User>): User {
  const roles = Array.from(new Set([...(base.roles ?? []), ...(profile.roles ?? [])]));
  return {
    ...base,
    ...profile,
    roles
  } as User;
}

export const profileResolver: ResolveFn<boolean> = () => {
  const userStore = inject(UserStore);
  const authService = inject(OidcAuthService);
  const apiService = inject(ApiService);

  const existingUser = userStore.user();
  if (existingUser) {
    return of(true);
  }

  return authService.user$.pipe(
    take(1),
    switchMap((user) => {
      if (!user) {
        return of(true);
      }

      userStore.setUser(user);

      return apiService.get<Partial<User>>('/me').pipe(
        tap((profile) => userStore.setUser(mergeProfileData(user, profile))),
        map(() => true),
        catchError(() => of(true))
      );
    })
  );
};
