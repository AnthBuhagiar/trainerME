import { loadSettings, saveSettings } from "@/lib/data/store";
import { relocalizeKeptRides } from "@/lib/player/keepRide";

/** A real IANA zone name ("Australia/Sydney"), or null. */
export function validZone(zone: unknown): string | null {
  if (typeof zone !== "string" || !zone.includes("/") || zone.length > 64) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return zone;
  } catch {
    return null;
  }
}

/**
 * The rider's time zone decides what "today" is and when rides started. It
 * comes from their phone (the most direct source) or a GPS ride on Strava.
 * When it changes, rides kept by Hour Power are re-timed to match.
 */
export function setRiderTimeZone(zone: unknown): boolean {
  const z = validZone(zone);
  const settings = loadSettings();
  if (!z || z === settings.timeZone) return false;
  saveSettings({ ...settings, timeZone: z });
  relocalizeKeptRides(z);
  return true;
}
