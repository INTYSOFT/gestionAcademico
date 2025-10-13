import { Route } from '@angular/router';
import { initialDataResolver } from 'app/app.resolvers';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';

// @formatter:off
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
export const appRoutes: Route[] = [

    // Redirect empty path to '/example'
    {path: '', pathMatch : 'full', redirectTo: 'mantenimiento/alumnos'},

    // Redirect signed-in user to the '/example'
    //
    // After the user signs in, the sign-in page will redirect the user to the 'signed-in-redirect'
    // path. Below is another redirection for that path to redirect the user to the desired
    // location. This is a small convenience to keep all main routes together here on this file.
    {
        path: 'signed-in-redirect',
        pathMatch: 'full',
        redirectTo: 'mantenimiento/alumnos',
    },

    // Auth routes for guests
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'confirmation-required', loadChildren: () => import('app/modules/auth/confirmation-required/confirmation-required.routes')},
            {path: 'forgot-password', loadChildren: () => import('app/modules/auth/forgot-password/forgot-password.routes')},
            {path: 'reset-password', loadChildren: () => import('app/modules/auth/reset-password/reset-password.routes')},
            {path: 'sign-in', loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes')},
            {path: 'sign-up', loadChildren: () => import('app/modules/auth/sign-up/sign-up.routes')}
        ]
    },

    // Auth routes for authenticated users
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'sign-out', loadChildren: () => import('app/modules/auth/sign-out/sign-out.routes')},
            {path: 'unlock-session', loadChildren: () => import('app/modules/auth/unlock-session/unlock-session.routes')}
        ]
    },

    // Landing routes
    {
        path: '',
        component: LayoutComponent,
        data: {
            layout: 'empty'
        },
        children: [
            {path: 'home', loadChildren: () => import('app/modules/landing/home/home.routes')},
        ]
    },

    // Admin routes
    {
        path: '',
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        component: LayoutComponent,
        resolve: {
            initialData: initialDataResolver
        },
        children: [
            {path: 'example', loadChildren: () => import('app/modules/admin/example/example.routes')},
            {

                path: 'mantenimiento',
                children: [
                    {
                        path: 'nivel-seccion',
                        loadChildren: () =>
                            import(
                                'app/modules/admin/mantenimiento/nivel-seccion/nivel-seccion.routes'
                            ),
                    },
                    {
                        path: 'universidades',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/universidades/universidades.routes'),
                    },
                    {
                        path: 'cursos',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/cursos/cursos.routes'),
                    },
                    {
                        path: 'especialidad-docente',
                        loadChildren: () =>
                            import(
                                'app/modules/admin/mantenimiento/especialidades/especialidades.routes'
                            ),
                    },
                    {
                        path: 'ciclos',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/ciclos/ciclos.routes'),
                    },
                    {
                        path: 'sedes',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/sedes/sedes.routes'),
                    },
                    {
                        path: 'colegios',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/colegios/colegios.routes'),
                    },                 

                    {
                        path: 'apoderados',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/apoderados/apoderados.routes').then(
                                (m) => m.apoderadosRoutes
                            ),
                    },
                    {
                        path: 'alumnos',
                        loadChildren: () =>
                            import('app/modules/admin/mantenimiento/alumnos/alumnos.routes').then(
                                (m) => m.alumnosRoutes
                            ),
                    },
                    { path: '', pathMatch: 'full', redirectTo: 'alumnos' },
                ],

            }
        ]
    },
    { path: '**', redirectTo: 'mantenimiento/alumnos' }
];
