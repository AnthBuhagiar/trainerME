import { sessionTitle } from "@/components/SessionCard";
import { loadSent } from "@/lib/garmin/client";
import { readJson, writeJson } from "@/lib/data/store";
import { addDays } from "@/lib/plan/calendar";
import { loadState } from "@/lib/plan/current";
import { weekStatus } from "@/lib/plan/weekStrip";
import { brandLine, withBrand } from "@/lib/strava/brandLine";
import { canUpload, stravaGet, stravaUpdateDescription } from "@/lib/strava/client";
import type { Activity } from "@/lib/types";

/**
 * A short line on Strava saying a ride was an Hour Power workout: on rides
 * uploaded from the player, gym sessions logged in the app, and Hour Power
 * workouts sent to Garmin and ridden there (added to the ride's description
 * once Garmin's copy reaches Strava). Always on: one line,
 * never more.
 */

const FILE = "strava-branded.json";
/** Rides older than this are left alone: only fresh rides get the line, never the rider's history. */
const MAX_AGE_DAYS = 3;
/** Each sync tags a few at most, so Strava's rate limit stays for syncing. */
const PER_RUN = 3;

/**
 * Strava rides that did a planned session Hour Power sent to Garmin, not yet
 * tagged: [activity, workout name].
 */
export function ridesToBrand(sessions: { activity: Activity; title: string; key: string }[], sentKeys: Set<string>, done: Set<string>, today: string): { id: string; title: string }[] {
  const oldest = addDays(today, -MAX_AGE_DAYS);
  return sessions
    .filter(({ activity, key }) => sentKeys.has(key) && /^\d+$/.test(activity.id) && !done.has(activity.id) && activity.startLocal.slice(0, 10) >= oldest)
    .map(({ activity, title }) => ({ id: activity.id, title }));
}

/** Add the line to Garmin-ridden Hour Power workouts that have reached Strava. Never throws. */
export async function brandGarminRides(): Promise<number> {
  try {
    const state = loadState();
    if (!canUpload()) return 0;
    const sent = loadSent();
    if (!sent.length) return 0;
    const sentKeys = new Set(sent.map((w) => w.key));
    const done = new Set(readJson<string[]>(FILE, []));
    const found: { activity: Activity; title: string; key: string }[] = [];
    for (const weekStart of new Set([state.thisWeekStart, addDays(state.thisWeekStart, -7)])) {
      const { doneBy } = weekStatus(state.week(weekStart), state.activities, state.today, sessionTitle);
      for (const [activity, s] of doneBy) found.push({ activity, title: sessionTitle(s), key: `${s.date} ${s.start}` });
    }
    let tagged = 0;
    for (const { id, title } of ridesToBrand(found, sentKeys, done, state.today).slice(0, PER_RUN)) {
      const current = await stravaGet<{ description?: string | null }>(`/activities/${id}`);
      const description = withBrand(current.description, brandLine(title));
      if (description) {
        await stravaUpdateDescription(Number(id), description);
        tagged++;
      }
      done.add(id);
      writeJson(FILE, [...done].slice(-500));
    }
    return tagged;
  } catch {
    return 0; // a nice-to-have: never in the way of a sync
  }
}
