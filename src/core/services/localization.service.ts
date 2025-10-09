import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_LOCALE, getStoredLocale } from '../../i18n/setup';

export interface LocaleOption {
  code: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class LocalizationService {
  private readonly document = inject(DOCUMENT);
  private readonly localeSignal = signal<string>(DEFAULT_LOCALE);

  readonly locale = computed(() => this.localeSignal());
  readonly locales = signal<LocaleOption[]>([
    { code: 'es', label: 'Español' },
    { code: 'en', label: 'English' }
  ]);

  initialize(): void {
    const current = this.document.documentElement.lang || getStoredLocale();
    this.localeSignal.set(current);
  }

  setLocale(locale: string): void {
    if (!locale || locale === this.locale()) {
      return;
    }

    this.document.defaultView?.localStorage?.setItem('gestion-academico:locale', locale);
    this.localeSignal.set(locale);
    this.document.defaultView?.location?.reload();
  }

  getStoredLocale(): string | null {
    return this.document.defaultView?.localStorage?.getItem('gestion-academico:locale') ?? null;
  }
}
