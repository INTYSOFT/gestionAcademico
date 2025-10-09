import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserStore } from '../services/user.store';

export const profileResolver: ResolveFn<unknown> = () => {
  const userStore = inject(UserStore);
  return userStore.profile();
};
