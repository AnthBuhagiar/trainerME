import { applyCheckIn } from "@/lib/plan/checkin";
import type { Phase } from "@/lib/plan/periodise";
import { weekReview } from "@/lib/plan/review";
import type { WeekContext, WeekPlan } from "@/lib/plan/week";
import type { History } from "@/lib/engine/history";
import type { Activity, Ride } from "@/lib/types";

/**
 * Adaptation rules P13–P17 (docs/training-protocol.md): the plan responds to
 * what was actually ridden, by fixed thresholds, not judgement.
 *
 *  P13 Missed training: 14+ days without a ride → comeback week (easy, intervals
 *      return next week); 7–13 days, or under half of last week's planned time
 *      → easing back in (one key session, a step lower).
 *  P14 Progression is earned: only loading weeks where at least 70% of sessions
 *      were done move the plan up a step; future weeks are projected from there.
 *  P15 Recovery when needed: a scheduled recovery week after three loading weeks
 *      with under half the planned sessions done becomes a normal week.
 *  P16 Fatigue: hour power down 3% or more over three weeks while at least 80%
 *      of sessions were done → an extra recovery week.
 *  P17 Unplanned hard ride: a hard ride yesterday turns today's hard session easy.
 */

export const COMEBACK_DAYS = 14;
export const REENTRY_DAYS = 7;
export const REENTRY_MIN_TIME_SHARE = 0.5;
export const EARNED_WEEK_SHARE = 0.7;
export const SKIP_RECOVERY_SHARE = 0.5;
export const FATIGUE_DROP = 0.03;
export const FATIGUE_MIN_SHARE = 0.8;

const DAY = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const day = (iso: string) => iso.slice(0, 10);

export interface AdaptInput {
  today: string;
  thisMonday: string;
  phases: Phase[];
  activities: Activity[];
  history: History | null;
  /** The week as planned without adaptation, used to measure what got done. */
  planned: (monday: string) => WeekPlan;
}

export interface Adaptation {
  /** Settings for planWeek for this week (and progression for later weeks). */
  context: (monday: string) => Pick<WeekContext, "step" | "mode" | "adaptation" | "skipRecovery">;
  /** Shown on Today and Week when the current week was adapted. */
  note?: string;
}

function share(done: number, planned: number): number {
  return planned ? done / planned : 1;
}

function estimateOn(history: History | null, date: string): number | null {
  const before = history?.points.filter((p) => day(p.date) <= date) ?? [];
  return before.length ? before[before.length - 1].hourPower : null;
}

export function adapt(input: AdaptInput): Adaptation {
  const { today, thisMonday, phases, activities, history, planned } = input;
  const phase = phases.find((p) => p.start <= thisMonday && thisMonday <= p.end) ?? null;
  const reviewOf = (monday: string) => weekReview(planned(monday), activities, history);

  // P13
  const lastRide = activities.filter((a) => a.sportType.includes("Ride") && day(a.startLocal) <= today).map((a) => day(a.startLocal)).sort().at(-1);
  const daysOff = lastRide ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastRide}T00:00:00Z`)) / DAY) : Infinity;
  const lastWeek = reviewOf(addDays(thisMonday, -7));
  let mode: WeekContext["mode"];
  let note: string | undefined;
  if (lastRide && daysOff >= COMEBACK_DAYS) {
    mode = "comeback";
    note = `${daysOff} days since your last ride, so this week is easy riding. Intervals come back next week.`;
  } else if (lastRide && (daysOff >= REENTRY_DAYS || (lastWeek.plannedMinutes > 0 && share(lastWeek.doneMinutes, lastWeek.plannedMinutes) < REENTRY_MIN_TIME_SHARE))) {
    mode = "reentry";
    note = "Last week was light, so this week eases back in: one key session, a step lower.";
  }

  // P14: earned steps in the current phase, from completed past loading weeks.
  let earned = 0;
  const pastLoading: string[] = [];
  if (phase) {
    for (let m = phase.start; m < thisMonday; m = addDays(m, 7)) {
      if (phase.recoveryWeeks.includes(m)) continue;
      pastLoading.push(m);
      const r = reviewOf(m);
      if (share(r.done, r.planned) >= EARNED_WEEK_SHARE) earned++;
    }
  }

  // P15: was there enough load to need the scheduled recovery week?
  const lastThree = pastLoading.slice(-3).map(reviewOf);
  const lightBlock = lastThree.length === 3 && lastThree.every((r) => share(r.done, r.planned) < SKIP_RECOVERY_SHARE);

  // P16: sliding despite doing the work → extra recovery.
  const now = estimateOn(history, today);
  const before = estimateOn(history, addDays(today, -21));
  const recentShares = [reviewOf(addDays(thisMonday, -7)), reviewOf(addDays(thisMonday, -14))].map((r) => share(r.done, r.planned));
  const fatigued =
    !mode && now !== null && before !== null && now <= before * (1 - FATIGUE_DROP) && recentShares.every((x) => x >= FATIGUE_MIN_SHARE) && phase?.name !== "taper";
  if (fatigued) {
    mode = "deload";
    note = `Hour power has slipped ${Math.round(before! - now!)} W in three weeks while you've done the work: an extra recovery week to absorb it.`;
  }

  const isRecovery = (m: string) => !!phase?.recoveryWeeks.includes(m);
  return {
    note: note ?? (lightBlock && isRecovery(thisMonday) ? "Recovery week skipped: the last three weeks were light, so there's little to recover from." : undefined),
    context: (monday) => {
      if (monday < thisMonday) return {};
      const samePhase = !!phase && monday <= phase.end;
      // Project future progression from what's been earned, counting loading weeks from this one.
      let ahead = 0;
      for (let m = thisMonday; m < monday; m = addDays(m, 7)) if (!isRecovery(m)) ahead++;
      const ctx: Pick<WeekContext, "step" | "mode" | "adaptation" | "skipRecovery"> = samePhase ? { step: earned + ahead } : {};
      if (monday === thisMonday) {
        if (mode) Object.assign(ctx, { mode, adaptation: note });
        if (lightBlock && isRecovery(monday)) Object.assign(ctx, { skipRecovery: true, adaptation: "Recovery week skipped: the last three weeks were light." });
      }
      return ctx;
    },
  };
}

/** P17: a hard ride the day before (planned or not) makes today's hard session easy. */
export function afterHardRide(week: WeekPlan, rides: Ride[], trainingHourPower: number, today: string): WeekPlan {
  const yesterday = addDays(today, -1);
  const hard = rides.some((r) => {
    if (day(r.startLocal) !== yesterday || !r.streams) return false;
    const np = r.streams.np ?? 0;
    const best20 = r.streams.powerCurve?.["1200"] ?? 0;
    return (np >= 0.85 * trainingHourPower && r.movingTime >= 45 * 60) || best20 >= 0.95 * trainingHourPower;
  });
  if (!hard) return week;
  return {
    ...week,
    sessions: week.sessions.map((s) =>
      s.date === today && s.ride?.workout.intensity === "hard"
        ? { ...applyCheckIn(s, "tired", week.phase), adjusted: "You rode hard yesterday, so today is easy. Two hard days in a row add fatigue more than fitness." }
        : s,
    ),
  };
}
