import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout.component';
import { AuthLayoutComponent } from './layouts/auth-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { profileResolver } from './core/resolvers/profile.resolver';
import { OidcAuthService } from './core/auth/oidc-auth.service';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [() => {
      const router = inject(Router);
      const authService = inject(OidcAuthService);
      const target = authService.isAuthenticated() ? 'dashboard' : 'sign-in';
      return router.createUrlTree([target]);
    }]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    resolve: { profile: profileResolver },
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
        canActivate: [() => {
          const authService = inject(OidcAuthService);
          if (authService.isAuthenticated()) {
            return inject(Router).createUrlTree(['dashboard']);
          }

          return true;
        }],
        loadComponent: () => import('./features/auth/sign-in.component').then((m) => m.SignInComponent)
      },
      {
        path: 'auth/callback',
        loadComponent: () => import('./features/auth/auth-callback.component').then((m) => m.AuthCallbackComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
