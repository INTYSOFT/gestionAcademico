import { Routes } from '@angular/router';
import { CiclosComponent } from './ciclos.component';

const ciclosRoutes: Routes = [
    {
        path: '',
        component: CiclosComponent,
        data: {
            breadcrumb: 'Ciclos',
        },
    },
];

export default ciclosRoutes;
