export const toDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime());

export const isSameLocalDate = (left: Date, right: Date): boolean =>
  isValidDate(left) && isValidDate(right) && toDateKey(left) === toDateKey(right);

export const isLocalDateOnOrBefore = (left: Date, right: Date): boolean =>
  isValidDate(left) && isValidDate(right) && toDateKey(left) <= toDateKey(right);

export const startOfToday = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

export const endOfToday = (): Date => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const formatShortDate = (value: string): string =>
  new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(new Date(value));
