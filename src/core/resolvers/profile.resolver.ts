import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { UserStore } from '../services/user.store';

export const profileResolver: ResolveFn<boolean> = () => {
  const userStore = inject(UserStore);
  userStore.initialize();
  return true;
};
