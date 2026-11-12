import { multiUser } from "@/lib/data/store";
import { appUrl } from "@/lib/strava/client";

/**
 * The one line on Strava that says a ride or gym session was an Hour Power
 * workout (see brand.ts for Garmin-ridden workouts).
 */

const MARK = "Hour Power";

/** The address riders can find the app at; only a real one (not localhost or a codespace). */
function publicHost(): string | null {
  if (!multiUser()) return null;
  try {
    const host = new URL(appUrl()).host;
    return /localhost|github\.dev|app\.github/.test(host) ? null : host;
  } catch {
    return null;
  }
}

/** "⚡ Hour Power workout: Threshold 3×12 · hourpowerapp.cc" */
export function brandLine(workout: string, kind: "workout" | "gym session" = "workout"): string {
  const host = publicHost();
  return `⚡ Hour Power ${kind}: ${workout}${host ? ` · ${host}` : ""}`;
}

/** The ride's description with the line added (once). */
export function withBrand(description: string | null | undefined, line: string): string | null {
  const d = (description ?? "").trim();
  if (d.includes(MARK)) return null; // already says so
  return d ? `${d}\n\n${line}` : line;
}
