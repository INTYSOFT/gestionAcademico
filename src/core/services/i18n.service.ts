import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { AppLocale, LOCALE_OPTIONS, STORAGE_KEY } from '@core/i18n/i18n.config';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly localeSignal = signal<AppLocale>(this.readInitialLocale());

  readonly locale = this.localeSignal.asReadonly();
  readonly locales = LOCALE_OPTIONS;

  setLocale(locale: AppLocale): void {
    this.localeSignal.set(locale);
    this.document.documentElement.lang = locale;
    this.persist(locale);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  private readInitialLocale(): AppLocale {
    if (typeof window === 'undefined') {
      return this.document.documentElement.lang === 'en' ? 'en' : 'es';
    }

    const stored = window.localStorage?.getItem(STORAGE_KEY) as AppLocale | null;
    if (stored && this.isSupported(stored)) {
      return stored;
    }

    const attributeLocale = (this.document.documentElement.lang || 'es').slice(0, 2) as AppLocale;
    return this.isSupported(attributeLocale) ? attributeLocale : 'es';
  }

  private persist(locale: AppLocale): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage?.setItem(STORAGE_KEY, locale);
  }

  private isSupported(locale: string): locale is AppLocale {
    return this.locales.some((option) => option.code === locale);
  }
}
