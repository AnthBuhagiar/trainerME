import type { History } from "@/lib/engine/history";
import { kindOf } from "@/lib/plan/timeBudget";
import type { WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

/**
 * The weekly recap: what was planned, what got done, how hour power moved,
 * and what next week holds. Missed sessions are reported, never carried over.
 */

export interface WeekReview {
  monday: string;
  planned: number;
  done: number;
  plannedMinutes: number;
  /** Minutes of riding and strength actually done that week. */
  doneMinutes: number;
  rides: number;
  strength: number;
  /** Change in estimated hour power across the week (W). */
  change: number | null;
  /** The ride that moved the estimate most, if it went up. */
  best?: { name: string; delta: number };
  headline: string;
}

const day = (iso: string) => iso.slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

function estimateOn(history: History, date: string): number | null {
  const before = history.points.filter((p) => day(p.date) <= date);
  return before.length ? before[before.length - 1].hourPower : null;
}

export function weekReview(plan: WeekPlan, activities: Activity[], history: History | null): WeekReview {
  const sunday = addDays(plan.monday, 6);
  const inWeek = activities.filter((a) => day(a.startLocal) >= plan.monday && day(a.startLocal) <= sunday);
  const kinds = inWeek.map((a) => ({ date: day(a.startLocal), kind: kindOf(a.sportType), minutes: Math.round((kindOf(a.sportType) === "ride" ? a.movingTime : a.elapsedTime) / 60) }));
  // A planned session counts as done if something of the same kind happened that day (or, failing that, any unused one that week).
  const used = new Set<number>();
  let done = 0;
  for (const s of plan.sessions) {
    let i = kinds.findIndex((k, j) => !used.has(j) && k.kind === s.kind && k.date === s.date);
    if (i < 0) i = kinds.findIndex((k, j) => !used.has(j) && k.kind === s.kind);
    if (i >= 0) {
      used.add(i);
      done++;
    }
  }
  const relevant = kinds.filter((k) => k.kind === "ride" || k.kind === "strength");
  const start = history ? estimateOn(history, addDays(plan.monday, -1)) : null;
  const end = history ? estimateOn(history, sunday) : null;
  const change = start !== null && end !== null ? Math.round((end - start) * 10) / 10 : null;
  const best = history?.ledger
    .filter((e) => day(e.date) >= plan.monday && day(e.date) <= sunday && e.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
  const planned = plan.sessions.length;
  const headline =
    planned === 0
      ? "A quiet week."
      : done >= planned
        ? "Every session done."
        : done === 0
          ? "Life won this week. Nothing is owed; next week starts fresh."
          : `${done} of ${planned} done. Missed sessions are gone, not owed.`;
  return {
    monday: plan.monday,
    planned,
    done: Math.min(done, planned),
    plannedMinutes: plan.sessions.reduce((n, s) => n + s.minutes, 0),
    doneMinutes: relevant.reduce((n, k) => n + k.minutes, 0),
    rides: relevant.filter((k) => k.kind === "ride").length,
    strength: relevant.filter((k) => k.kind === "strength").length,
    change,
    best: best ? { name: best.rideName, delta: Math.round(best.delta * 10) / 10 } : undefined,
    headline,
  };
}

/** The week to recap: on Sunday the week ending today, otherwise last week. */
export function reviewMonday(today: string, thisMonday: string): string {
  return new Date(`${today}T00:00:00Z`).getUTCDay() === 0 ? thisMonday : addDays(thisMonday, -7);
}
