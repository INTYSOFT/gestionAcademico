import { loadTranslations } from '@angular/localize';
import { ɵsetLocaleId as setLocaleId } from '@angular/core';
import { AppLocale, DEFAULT_LOCALE, getStoredLocale, isSupportedLocale } from '@core/i18n/i18n.config';

const TRANSLATION_PATH = 'i18n/messages';

export async function initializeLocale(): Promise<AppLocale> {
  const stored = getStoredLocale();
  const browserLocale =
    typeof navigator !== 'undefined'
      ? navigator.language?.slice(0, 2).toLowerCase() ?? DEFAULT_LOCALE
      : DEFAULT_LOCALE;
  const locale: AppLocale = stored ?? (isSupportedLocale(browserLocale) ? browserLocale : DEFAULT_LOCALE);

  await loadLocaleData(locale);
  setLocaleId(locale);
  setDocumentLang(locale);

  return locale;
}

async function loadLocaleData(locale: AppLocale): Promise<void> {
  if (locale === DEFAULT_LOCALE) {
    return;
  }

  const response = await fetch(`${TRANSLATION_PATH}.${locale}.xlf`, { cache: 'no-cache' });
  if (!response.ok) {
    console.warn(`Unable to load translations for locale ${locale}, falling back to default.`);
    return;
  }

  const content = await response.text();
  const translations = parseXlf(content);
  loadTranslations(translations);
}

function setDocumentLang(locale: AppLocale): void {
  document.documentElement.lang = locale;
}

function parseXlf(content: string): Record<string, string> {
  const parser = new DOMParser();
  const xml = parser.parseFromString(content, 'application/xml');
  const units = Array.from(xml.getElementsByTagName('trans-unit'));
  return units.reduce<Record<string, string>>((acc, unit) => {
    const id = unit.getAttribute('id');
    const target = unit.getElementsByTagName('target')[0]?.textContent;
    if (id && target) {
      acc[id] = target;
    }
    return acc;
  }, {});
}
