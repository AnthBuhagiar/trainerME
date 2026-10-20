const DAY_MS = 86_400_000;

/** Whole-ish days from a to b (b - a), using the local date-time strings as-is. */
export function daysBetween(a: string, b: string): number {
  return (Date.parse(b) - Date.parse(a)) / DAY_MS;
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY_MS).toISOString().slice(0, 19);
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 19);
}
