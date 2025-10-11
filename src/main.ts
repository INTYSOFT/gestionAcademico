import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { ApplicationConfig, LOCALE_ID, mergeApplicationConfig } from '@angular/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

import { AppComponent } from 'app/app.component';
import { appConfig } from 'app/app.config';

ModuleRegistry.registerModules([AllCommunityModule]);
registerLocaleData(localeEs);

const esConfig: ApplicationConfig = {
    providers: [
        { provide: LOCALE_ID, useValue: 'es-ES' },
        { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    ],
};

bootstrapApplication(AppComponent, mergeApplicationConfig(appConfig, esConfig)).catch((err) =>
    console.error(err)
);
