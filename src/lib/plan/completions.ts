import { readJson, writeJson } from "@/lib/data/store";
import type { WeekPlan } from "@/lib/plan/week";

/**
 * Trainer workouts done in another app (Zwift, MyWhoosh and so on), marked by
 * the rider. A marked session counts as done everywhere: the week, the recap
 * and progression (P14). If that app's ride also reaches Strava, it's matched
 * to the same session, not counted twice.
 */

/** Which app isn't asked: confirming it's done is enough. */
export const ANOTHER_APP = "another app";

const FILE = "completions.json";
type Completions = Record<string, { app: string; at: string; ride?: string; stravaId?: number }>;

/** Ridden in the app's own player. */
export const HOUR_POWER = "Hour Power";

export const completionKey = (date: string, start: string) => `${date} ${start}`;

export function loadCompletions(): Completions {
  return readJson<Completions>(FILE, {});
}

export function markDoneElsewhere(date: string, start: string, app = ANOTHER_APP, now = new Date()): void {
  writeJson(FILE, { ...loadCompletions(), [completionKey(date, start)]: { app, at: now.toISOString() } });
}

/** A planned session ridden in the player (on its day or another): `ride` is the ride's local start. */
export function markRidden(date: string, start: string, ride: string, now = new Date(), stravaId?: number): void {
  writeJson(FILE, { ...loadCompletions(), [completionKey(date, start)]: { app: HOUR_POWER, at: now.toISOString(), ride, ...(stravaId ? { stravaId } : {}) } });
}

export function unmarkDoneElsewhere(date: string, start: string): void {
  const all = loadCompletions();
  delete all[completionKey(date, start)];
  writeJson(FILE, all);
}

/** Tag each session marked as done in another app. */
export function applyCompletions(week: WeekPlan, completions: Completions): WeekPlan {
  if (!week.sessions.some((s) => completions[completionKey(s.date, s.start)])) return week;
  return {
    ...week,
    sessions: week.sessions.map((s) => {
      const c = completions[completionKey(s.date, s.start)];
      return c ? { ...s, completedIn: c.app, ...(c.ride ? { completedRide: c.ride } : {}) } : s;
    }),
  };
}

/** Rides re-timed (old local start → new): move the sessions they did with them. */
export function retimeRidden(moved: Map<string, string>): void {
  const all = loadCompletions();
  let changed = false;
  for (const c of Object.values(all)) {
    const to = c.ride && moved.get(c.ride);
    if (to) {
      c.ride = to;
      changed = true;
    }
  }
  if (changed) writeJson(FILE, all);
}
