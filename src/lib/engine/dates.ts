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
