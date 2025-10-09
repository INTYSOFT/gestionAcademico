export type AppLocale = 'es' | 'en';

export interface LocaleOption {
  readonly code: AppLocale;
  readonly label: string;
}

export const DEFAULT_LOCALE: AppLocale = 'es';

export const LOCALE_OPTIONS: readonly LocaleOption[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' }
];

export const STORAGE_KEY = 'app.locale';

export function isSupportedLocale(locale: string | null | undefined): locale is AppLocale {
  return LOCALE_OPTIONS.some((option) => option.code === locale);
}

export function getStoredLocale(): AppLocale | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.localStorage?.getItem(STORAGE_KEY) ?? null;
  return isSupportedLocale(stored) ? stored : null;
}
