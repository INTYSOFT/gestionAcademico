import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { environment } from './environments/environment';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { setupLocalization } from './i18n/setup';

async function bootstrap(): Promise<void> {
  if (environment.production) {
    enableProdMode();
  }

  await setupLocalization();
  await bootstrapApplication(AppComponent, appConfig);
}

bootstrap().catch((err) => console.error(err));
