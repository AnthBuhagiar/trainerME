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
type Completions = Record<string, { app: string; at: string }>;

export const completionKey = (date: string, start: string) => `${date} ${start}`;

export function loadCompletions(): Completions {
  return readJson<Completions>(FILE, {});
}

export function markDoneElsewhere(date: string, start: string, app = ANOTHER_APP, now = new Date()): void {
  writeJson(FILE, { ...loadCompletions(), [completionKey(date, start)]: { app, at: now.toISOString() } });
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
      return c ? { ...s, completedIn: c.app } : s;
    }),
  };
}
