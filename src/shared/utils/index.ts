export const formatCurrency = (value: number, locale?: string, currency = 'EUR'): string => {
  const resolvedLocale =
    locale ?? (typeof document !== 'undefined' ? document.documentElement.lang || 'es-ES' : 'es-ES');

  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(value);
};

export const trackById = <T extends { id: string | number }>(_: number, item: T): string | number =>
  item.id;
