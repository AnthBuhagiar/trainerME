import { loadRawActivities, loadSettings, saveRawActivities, type RawActivity } from "@/lib/data/store";
import { completionKey, loadCompletions, markRidden, unmarkDoneElsewhere } from "@/lib/plan/completions";
import type { PlannedSession } from "@/lib/plan/week";
import { brandLine, brandOn } from "@/lib/strava/brandLine";
import { canUpload, stravaCreateManual } from "@/lib/strava/client";

/**
 * "Done it" for a planned gym session the rider didn't record: it counts as
 * done in Hour Power (a Weight Training activity on that day, linked to the
 * session) and, where they allowed uploads, is saved to Strava once. Strava's
 * copy, when it syncs, is the same activity (same start), so it isn't counted
 * twice.
 */

export interface StrengthLog {
  /** Strava's activity, if saved there. */
  stravaId?: number;
  /** Why it isn't on Strava, if it isn't. */
  stravaError?: string;
  reconnect?: boolean;
}

const idFor = (s: PlannedSession) => `hpgym-${s.date}-${s.start.replace(":", "")}`;
const startLocal = (s: PlannedSession) => `${s.date}T${/^\d{2}:\d{2}$/.test(s.start) ? s.start : "12:00"}:00`;

/** Has this session been logged with "Done it"? */
export function strengthLogged(s: PlannedSession): { stravaId?: number } | null {
  const c = loadCompletions()[completionKey(s.date, s.start)];
  return c && c.ride === startLocal(s) ? { stravaId: c.stravaId } : null;
}

export async function logStrength(s: PlannedSession, now = new Date()): Promise<StrengthLog> {
  if (!s.strength) throw new Error("Not a gym session.");
  const already = strengthLogged(s);
  if (already?.stravaId) return { stravaId: already.stravaId }; // once only: Strava can't delete a duplicate
  const at = startLocal(s);
  const activity: RawActivity = {
    id: idFor(s),
    source: "hourpower",
    name: s.strength.name,
    sport_type: "WeightTraining",
    start_local: at,
    is_trainer: false,
    summary: { distance: 0, moving_time: s.minutes * 60, elapsed_time: s.minutes * 60, elevation_gain: 0 },
  };
  saveRawActivities([...loadRawActivities().filter((a) => a.id !== activity.id), activity].sort((a, b) => a.start_local.localeCompare(b.start_local)));
  markRidden(s.date, s.start, at, now);

  if (!canUpload()) return { stravaError: "Strava needs permission to upload: reconnect and tick “Upload your activities”.", reconnect: true };
  try {
    const { id } = await stravaCreateManual({
      name: s.strength.name,
      sportType: "WeightTraining",
      startLocal: at,
      seconds: s.minutes * 60,
      description: [...s.strength.items, ...(brandOn(loadSettings()) ? ["", brandLine(s.strength.name, "gym session")] : [])].join("\n"),
    });
    markRidden(s.date, s.start, at, now, id);
    return { stravaId: id };
  } catch (e) {
    const message = (e as Error).message;
    return { stravaError: message, reconnect: /reconnect/i.test(message) };
  }
}

/** Undo in Hour Power. A Strava copy stays (Strava's API can't delete activities): the rider deletes it there. */
export function unlogStrength(s: PlannedSession): { stravaId?: number } {
  const was = strengthLogged(s);
  saveRawActivities(loadRawActivities().filter((a) => a.id !== idFor(s)));
  unmarkDoneElsewhere(s.date, s.start);
  return { stravaId: was?.stravaId };
}
