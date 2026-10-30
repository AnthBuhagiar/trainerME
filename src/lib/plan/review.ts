import type { History } from "@/lib/engine/history";
import { addDays, isLastDayOfWeek } from "@/lib/plan/calendar";
import { isCardio, isOtherTraining, label, replaceable } from "@/lib/plan/crossTraining";
import { kindOf } from "@/lib/plan/timeBudget";
import type { WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

/**
 * The weekly recap: what was planned, what got done, how hour power moved,
 * and what next week holds. Missed sessions are reported, never carried over.
 */

export interface WeekReview {
  weekStart: string;
  planned: number;
  done: number;
  /** For each planned session, in order: was it done? */
  sessionsDone: boolean[];
  plannedMinutes: number;
  /** Minutes of riding and strength actually done that week. */
  doneMinutes: number;
  rides: number;
  strength: number;
  /** Runs, rows, swims, walks: everything else that week, by day. */
  other: { id: string; date: string; name: string; minutes: number; counted: boolean }[];
  /** Change in estimated hour power across the week (W). */
  change: number | null;
  /** The ride that moved the estimate most, if it went up. */
  best?: { name: string; delta: number };
  headline: string;
}

const day = (iso: string) => iso.slice(0, 10);

function estimateOn(history: History, date: string): number | null {
  const before = history.points.filter((p) => day(p.date) <= date);
  return before.length ? before[before.length - 1].hourPower : null;
}

export function weekReview(plan: WeekPlan, activities: Activity[], history: History | null): WeekReview {
  const lastDay = addDays(plan.weekStart, 6); // Saturday
  const inWeek = activities.filter((a) => day(a.startLocal) >= plan.weekStart && day(a.startLocal) <= lastDay);
  const kinds = inWeek.map((a) => ({
    date: day(a.startLocal),
    kind: kindOf(a.sportType),
    minutes: Math.round((kindOf(a.sportType) === "ride" ? a.movingTime : a.elapsedTime) / 60),
    cardio: isCardio(a),
  }));
  // A planned session counts as done if something of the same kind happened that day (or, failing that, any unused one that week).
  const used = new Set<number>();
  const credited = new Set<number>();
  let done = 0;
  let elsewhereMinutes = 0;
  const sessionsDone: boolean[] = [];
  for (const s of plan.sessions) {
    if (s.completedIn) {
      // Done in another app: its ride, if it reached Strava, belongs to this session and nothing else.
      const j = kinds.findIndex((k, n) => !used.has(n) && k.kind === s.kind && k.date === s.date);
      if (j >= 0) used.add(j);
      else elsewhereMinutes += s.minutes;
      done++;
      sessionsDone.push(true);
      continue;
    }
    let i = kinds.findIndex((k, j) => !used.has(j) && k.kind === s.kind && k.date === s.date);
    if (i < 0) i = kinds.findIndex((k, j) => !used.has(j) && k.kind === s.kind);
    // P18: a run or other cardio that day covers an easy ride.
    if (i < 0 && replaceable(s, plan.sessions)) {
      i = kinds.findIndex((k, j) => !used.has(j) && k.cardio && k.date === s.date);
      if (i >= 0) credited.add(i);
    }
    if (i >= 0) {
      used.add(i);
      done++;
    }
    sessionsDone.push(i >= 0);
  }
  const relevant = kinds.filter((k, i) => k.kind === "ride" || k.kind === "strength" || credited.has(i));
  const other = inWeek
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => isOtherTraining(a))
    .map(({ a, i }) => ({ id: a.id, date: day(a.startLocal), name: label(a.sportType), minutes: kinds[i].minutes, counted: credited.has(i) }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const start = history ? estimateOn(history, addDays(plan.weekStart, -1)) : null;
  const end = history ? estimateOn(history, lastDay) : null;
  const change = start !== null && end !== null ? Math.round((end - start) * 10) / 10 : null;
  const best = history?.ledger
    .filter((e) => day(e.date) >= plan.weekStart && day(e.date) <= lastDay && e.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
  const planned = plan.sessions.length;
  const headline =
    planned === 0
      ? "A quiet week."
      : done >= planned
        ? "Every session done."
        : done === 0
          ? "None done. Next week starts fresh."
          : `${done} of ${planned} done.`;
  return {
    weekStart: plan.weekStart,
    planned,
    done: Math.min(done, planned),
    sessionsDone,
    plannedMinutes: plan.sessions.reduce((n, s) => n + s.minutes, 0),
    doneMinutes: relevant.reduce((n, k) => n + k.minutes, 0) + elsewhereMinutes,
    rides: relevant.filter((k) => k.kind === "ride").length,
    strength: relevant.filter((k) => k.kind === "strength").length,
    other,
    change,
    best: best ? { name: best.rideName, delta: Math.round(best.delta * 10) / 10 } : undefined,
    headline,
  };
}

/** The week to recap: on Saturday (the last day) the week ending today, otherwise last week. */
export function reviewWeekStart(today: string, thisWeekStart: string): string {
  return isLastDayOfWeek(today) ? thisWeekStart : addDays(thisWeekStart, -7);
}
