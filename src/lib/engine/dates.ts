const DAY_MS = 86_400_000;

/**
 * Wall-clock date-times ("2026-11-04T19:30:00", or a bare date) are read as UTC,
 * so day maths gives the same answer whatever time zone the server runs in.
 * Read as server-local time, a server on Sydney time moved every addDays()
 * result back 11 hours: midnight plus 3 days came out as 1 pm the day before.
 * Strings that carry a zone ("…Z", "…+11:00") are read as they are.
 */
function wallClockMs(iso: string): number {
  if (/(Z|[+-]\d{2}:?\d{2})$/.test(iso)) return Date.parse(iso);
  return Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : `${iso.slice(0, 19)}Z`);
}

/** Whole-ish days from a to b (b - a), using the local date-time strings as-is. */
export function daysBetween(a: string, b: string): number {
  return (wallClockMs(b) - wallClockMs(a)) / DAY_MS;
}

export function addDays(iso: string, days: number): string {
  return new Date(wallClockMs(iso) + days * DAY_MS).toISOString().slice(0, 19);
}

export function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * The rider's wall-clock time now, "YYYY-MM-DDTHH:MM:SS", in their time zone
 * (from Strava). Without one, the server's own zone, which on a hosted server
 * is usually UTC: a Sydney ride at 5:30 am would otherwise look like tomorrow.
 */
export function todayLocal(timeZone?: string, now = new Date()): string {
  if (timeZone) {
    try {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          timeZone,
          hourCycle: "h23",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
          .formatToParts(now)
          .map((p) => [p.type, p.value]),
      );
      return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    } catch {
      // Unknown zone name: fall back to the server's.
    }
  }
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 19);
}

/** The IANA zone from Strava's "(GMT+10:00) Australia/Sydney". */
export function zoneFromStrava(value: string | undefined): string | undefined {
  const zone = value?.split(") ").pop()?.trim();
  if (!zone || !zone.includes("/")) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return undefined;
  }
}

/** A local date-time ("2026-11-04T19:30:00") in `timeZone`, as UTC epoch ms. */
export function localToUtc(local: string, timeZone?: string): number {
  const asUtc = Date.parse(`${local}Z`);
  const offset = (ms: number) => Date.parse(`${todayLocal(timeZone, new Date(ms))}Z`) - ms;
  return asUtc - offset(asUtc - offset(asUtc));
}
