import { Routes } from '@angular/router';

export const ECOMMERCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ecommerce.component').then((m) => m.EcommerceComponent)
  }
];
