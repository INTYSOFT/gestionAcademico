export const trackById = <T extends { id: string | number }>(_: number, item: T): string | number =>
  item.id;
