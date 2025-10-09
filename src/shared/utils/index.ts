export const formatCurrency = (value: number, locale = 'es-ES', currency = 'EUR'): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(value);

export const trackById = <T extends { id: string | number }>(_: number, item: T): string | number =>
  item.id;
