import { loadActivities, loadRides, loadSettings } from "@/lib/data/store";
import { dateOnly, todayLocal } from "@/lib/engine/dates";
import { buildHistory } from "@/lib/engine/history";
import { buildModel } from "@/lib/engine/hourPower";
import { activeGoal, loadRoute } from "@/lib/goals/model";
import { goalSummary } from "@/lib/goals/summary";
import { applyCheckIns, loadCheckIns } from "@/lib/plan/checkin";
import { mondayOf, phaseOn } from "@/lib/plan/periodise";
import { applyStrengthTarget, inferTimeBudget } from "@/lib/plan/timeBudget";
import { EXTENDED_LONG_RIDE_MINUTES, extendedLongRideWeeks, planWeek, type WeekPlan } from "@/lib/plan/week";

/** Everything the screens need, read from the local store once per request. */
export function loadState() {
  const now = todayLocal();
  const today = dateOnly(now);
  const settings = loadSettings();
  const rides = loadRides();
  const history = rides.length ? buildHistory(buildModel(rides), now) : null;
  const current = history?.current ?? null;
  const budget = applyStrengthTarget(inferTimeBudget(loadActivities(), now));
  const goal = activeGoal(today);
  const summary = goal && current ? goalSummary(goal, current.hourPower, settings, today, current.durability.factor, loadRoute(goal)) : null;

  const extended = summary ? extendedLongRideWeeks(summary.phases) : new Set<string>();

  const checkIns = loadCheckIns();

  const week = (monday: string): WeekPlan => {
    const phase = summary ? phaseOn(summary.phases, monday) : null;
    const daysToGoal = goal ? Math.round((Date.parse(`${goal.date}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) / 86_400_000) : undefined;
    const plan = planWeek(budget, {
      monday,
      phase,
      daysToGoal: daysToGoal !== undefined && daysToGoal < 7 ? daysToGoal : undefined,
      extendedLongRide: extended.has(monday) ? EXTENDED_LONG_RIDE_MINUTES : undefined,
    });
    return applyCheckIns(plan, checkIns);
  };

  return { checkIns, now, today, settings, rides, history, current, budget, goal, summary, thisMonday: mondayOf(today), week };
}

export function nextMonday(monday: string): string {
  return new Date(Date.parse(`${monday}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
}
