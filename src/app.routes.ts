import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';
import { authGuard, authenticatedRedirectGuard } from './core/guards/auth.guard';
import { profileResolver } from './core/resolvers/profile.resolver';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
    canMatch: [authenticatedRedirectGuard]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'sign-in'
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    resolve: {
      profile: profileResolver
    },
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/routes').then((m) => m.DASHBOARD_ROUTES)
      },
      {
        path: 'ecommerce',
        loadChildren: () => import('./features/ecommerce/routes').then((m) => m.ECOMMERCE_ROUTES)
      }
    ]
  },
  {
    path: '',
    component: AuthLayoutComponent,
    children: [
      {
        path: 'sign-in',
        loadComponent: () => import('./features/auth/sign-in.component').then((m) => m.SignInComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
