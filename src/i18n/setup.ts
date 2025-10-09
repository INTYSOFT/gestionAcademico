import { loadTranslations } from '@angular/localize';
import { ɵsetLocaleId as setLocaleId } from '@angular/core';

const STORAGE_KEY = 'gestion-academico:locale';
const DEFAULT_LOCALE = 'es';
const XLIFF_SELECTOR = 'trans-unit';
const TARGET_SELECTOR = 'target';
const SOURCE_SELECTOR = 'source';

type SupportedLocale = 'es' | 'en';

function getStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
  return stored ?? DEFAULT_LOCALE;
}

async function fetchTranslations(locale: string): Promise<Record<string, string>> {
  if (locale === DEFAULT_LOCALE) {
    return {};
  }

  const response = await fetch(`/i18n/messages.${locale}.xlf`, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load translation file for locale ${locale}`);
  }

  const content = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'application/xml');
  const units = Array.from(doc.getElementsByTagName(XLIFF_SELECTOR));
  const translations: Record<string, string> = {};

  for (const unit of units) {
    const id = unit.getAttribute('id');
    if (!id) {
      continue;
    }

    const targetNode = unit.getElementsByTagName(TARGET_SELECTOR).item(0);
    const sourceNode = unit.getElementsByTagName(SOURCE_SELECTOR).item(0);
    const value = targetNode?.textContent?.trim() || sourceNode?.textContent?.trim();

    if (value) {
      translations[id] = value;
    }
  }

  return translations;
}

export async function setupLocalization(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const locale = getStoredLocale();

  if (locale !== DEFAULT_LOCALE) {
    try {
      const translations = await fetchTranslations(locale);
      loadTranslations(translations);
      setLocaleId(locale);
    } catch (error) {
      console.error('Failed to load translations', error);
    }
  }

  window.document.documentElement.lang = locale;
}

export { getStoredLocale, DEFAULT_LOCALE };
