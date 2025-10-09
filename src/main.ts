import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEn from '@angular/common/locales/en';
import { AppComponent, createAppConfig } from './app.config';
import { DEFAULT_LOCALE } from './core/i18n/i18n.config';
import { initializeLocale } from './core/i18n/i18n-loader';

registerLocaleData(localeEs);
registerLocaleData(localeEn);

initializeLocale()
  .then((locale) => bootstrapApplication(AppComponent, createAppConfig(locale)))
  .catch((error) => {
    console.error('Error initializing locale', error);
    return bootstrapApplication(AppComponent, createAppConfig(DEFAULT_LOCALE));
  });
