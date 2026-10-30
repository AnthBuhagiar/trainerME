import { dataDir, loadActivities, loadRides, loadSettings, rideDataVersion, saveSettings, smallCache } from "@/lib/data/store";
import { dateOnly, todayLocal } from "@/lib/engine/dates";
import { buildHistory } from "@/lib/engine/history";
import { buildModel } from "@/lib/engine/hourPower";
import { activeGoal, loadRoute } from "@/lib/goals/model";
import { goalSummary } from "@/lib/goals/summary";
import { adapt, afterHardRide } from "@/lib/plan/adapt";
import { budgetFromChoices, loadAvailability } from "@/lib/plan/availability";
import { applyAway, awayWeeks, loadAway } from "@/lib/plan/away";
import { applyCheckIns, loadCheckIns } from "@/lib/plan/checkin";
import { targetsState } from "@/lib/plan/targets";
import { weekStartOf, phaseOn } from "@/lib/plan/periodise";
import { spaceStrength } from "@/lib/plan/strengthSpacing";
import { applyStrengthTarget, inferTimeBudget } from "@/lib/plan/timeBudget";
import { EXTENDED_LONG_RIDE_MINUTES, extendedLongRideWeeks, planWeek, type WeekPlan } from "@/lib/plan/week";

const modelCache = smallCache<{ model: ReturnType<typeof buildModel> | null; history: ReturnType<typeof buildHistory> | null }>();

/** Everything the screens need, read from the local store once per request. */
export function loadState() {
  const settings = loadSettings();
  const now = todayLocal(settings.timeZone ?? process.env.APP_TIMEZONE);
  const today = dateOnly(now);
  const rides = loadRides();
  // The estimate only changes with new rides or a new day, so work it out once for both.
  const { model, history } = modelCache(dataDir(), `${rideDataVersion()}:${today}`, () => {
    const m = rides.length ? buildModel(rides) : null;
    return { model: m, history: m ? buildHistory(m, now) : null };
  });
  const current = history?.current ?? null;
  const activities = loadActivities();
  // The rider's chosen days win; otherwise the usual week is read from their ride history.
  const learnedBudget = applyStrengthTarget(inferTimeBudget(activities, now));
  const chosenDays = loadAvailability();
  const budget = chosenDays ? budgetFromChoices(chosenDays) : learnedBudget;
  const goal = activeGoal(today);
  const away = loadAway();
  const awayHolidays = goal ? awayWeeks(away, today, goal.date) : [];
  const summary =
    goal && current ? goalSummary(goal, current.hourPower, settings, today, current.durability.factor, loadRoute(goal), awayHolidays) : null;

  const extended = summary ? extendedLongRideWeeks(summary.phases) : new Set<string>();

  const checkIns = loadCheckIns();
  const targets = targetsState(settings, current?.hourPower ?? null);
  if (targets?.initial) {
    // First run: start training from today's estimate; later changes are offered, not applied.
    saveSettings({ ...settings, trainingHourPower: targets.training });
    settings.trainingHourPower = targets.training;
  }

  const baseContext = (weekStart: string) => {
    const phase = summary ? phaseOn(summary.phases, weekStart) : null;
    const daysToGoal = goal ? Math.round((Date.parse(`${goal.date}T00:00:00Z`) - Date.parse(`${weekStart}T00:00:00Z`)) / 86_400_000) : undefined;
    return {
      weekStart,
      phase,
      daysToGoal: daysToGoal !== undefined && daysToGoal <= 7 ? daysToGoal : undefined,
      extendedLongRide: extended.has(weekStart) ? EXTENDED_LONG_RIDE_MINUTES : undefined,
    };
  };
  // The week as planned, before adapting to what was actually ridden (used to measure what got done).
  const planned = (weekStart: string): WeekPlan => applyCheckIns(applyAway(planWeek(budget, baseContext(weekStart)), away, today), checkIns);
  const thisWeekStart = weekStartOf(today);
  const adaptation = adapt({ today, thisWeekStart, phases: summary?.phases ?? [], activities, history, planned });

  const week = (weekStart: string): WeekPlan => {
    const plan = applyCheckIns(applyAway(planWeek(budget, { ...baseContext(weekStart), ...adaptation.context(weekStart) }), away, today), checkIns);
    if (weekStart !== thisWeekStart) return plan;
    const spaced = spaceStrength(plan, activities, today);
    return targets ? afterHardRide(spaced, rides, targets.training, today, activities) : spaced;
  };

  return { learnedBudget, chosenDays, away, model, activities, targets, checkIns, now, today, settings, rides, history, current, budget, goal, summary, thisWeekStart, week, adaptation };
}

export function nextWeekStart(weekStart: string): string {
  return new Date(Date.parse(`${weekStart}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
}
