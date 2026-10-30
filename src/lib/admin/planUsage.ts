import { loadState } from "@/lib/plan/current";
import { weekReview } from "@/lib/plan/review";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";

/**
 * How one rider's plan is being followed, for the admin dashboard (F4): for each
 * of the last few finished weeks, what was planned and done, and for every
 * session whether it was changed from the plan as first built (a check-in, a
 * busy or away day, strength spacing) and to what. Session names only — no
 * power, heart rate or check-in answers leave this function.
 */

export type ChangeReason = "Tired check-in" | "Short on time" | "Busy day" | "Away day" | "Strength spacing" | "Hard day before" | "Other";

export interface SessionOutcome {
  weekStart: string;
  /** The session as the plan first built it. */
  planned: string;
  kind: PlannedSession["kind"];
  /** What the rider was actually given, when it changed. */
  became: string | null;
  change: "swapped" | "shortened" | "moved" | null;
  reason: ChangeReason | null;
  done: boolean;
}

export interface WeekOutcome {
  weekStart: string;
  planned: number;
  done: number;
}

export interface PlanUsage {
  weeks: WeekOutcome[];
  sessions: SessionOutcome[];
}

const DAY = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export const sessionName = (s: PlannedSession): string => s.ride?.workout.name ?? s.strength?.name ?? s.kind;

export function reasonFor(adjusted: string): ChangeReason {
  if (/^(Tired|Lighter today)/.test(adjusted)) return "Tired check-in";
  if (/^(Short on time|Shortened to the essentials)/.test(adjusted)) return "Short on time";
  if (/^Busy day/.test(adjusted)) return "Busy day";
  if (/away/i.test(adjusted)) return "Away day";
  if (/^Moved from/.test(adjusted)) return "Strength spacing";
  if (/^Easier today/.test(adjusted)) return "Hard day before";
  return "Other";
}

/** Pair each session given to the rider with the one the plan first built. */
export function compareWeeks(base: WeekPlan, given: WeekPlan, doneFlags: boolean[]): SessionOutcome[] {
  const unused = new Set(base.sessions.map((_, i) => i));
  return given.sessions.map((s, idx) => {
    const from = s.movedFrom ?? s.date;
    let j = [...unused].find((i) => base.sessions[i].date === from && base.sessions[i].kind === s.kind);
    if (j === undefined) j = [...unused].find((i) => base.sessions[i].kind === s.kind);
    if (j !== undefined) unused.delete(j);
    const original = j !== undefined ? base.sessions[j] : s;
    const plannedName = sessionName(original);
    const givenName = sessionName(s);
    let change: SessionOutcome["change"] = null;
    if (s.adjusted || givenName !== plannedName || s.movedFrom) {
      change = givenName !== plannedName ? "swapped" : s.movedFrom || s.date !== original.date ? "moved" : "shortened";
    }
    return {
      weekStart: given.weekStart,
      planned: plannedName,
      kind: s.kind,
      became: change === "swapped" ? givenName : null,
      change,
      reason: change ? reasonFor(s.adjusted ?? "") : null,
      done: doneFlags[idx] ?? false,
    };
  });
}

/**
 * The last `weeks` finished weeks for the rider in scope (call inside runAsAthlete).
 * Only weeks starting on or after `since` (when they started using Hour Power)
 * count: before that nobody was following the plan, so it would measure history, not the app.
 */
export function planUsage(weeks = 8, since?: string): PlanUsage {
  const state = loadState();
  const out: PlanUsage = { weeks: [], sessions: [] };
  // Only weeks since the rider's first activity count; before that there was nothing to follow.
  const first = state.activities.map((a) => a.startLocal.slice(0, 10)).sort()[0];
  for (let k = weeks; k >= 1; k--) {
    const ws = addDays(state.thisWeekStart, -7 * k);
    if (!first || addDays(ws, 6) < first) continue;
    if (since && ws < since.slice(0, 10)) continue;
    const given = state.week(ws);
    const review = weekReview(given, state.activities, state.history);
    out.weeks.push({ weekStart: ws, planned: review.planned, done: review.done });
    out.sessions.push(...compareWeeks(state.basePlan(ws), given, review.sessionsDone));
  }
  return out;
}
