import type { Goal } from "@/lib/goals/model";
import { DEFAULT_PHYSICS, powerForTarget, predictEvent, sustainableFraction, type RiderPhysics } from "@/lib/goals/eventTime";
import { christmasWindow, periodise, phaseOn, type Phase } from "@/lib/plan/periodise";
import type { AthleteSettings } from "@/lib/types";

/** What the home screen needs to say about the goal. */
export interface GoalSummary {
  goal: Goal;
  phases: Phase[];
  phase: Phase | null;
  daysToGo: number;
  weeksToGo: number;
  /** Hour power the ring fills towards. */
  targetHourPower: number;
  /** Finish time at today's hour power (events only). */
  predicted?: { seconds: number; power: number };
  /** Average power and hour power needed for the rider's target time (events with a target only). */
  needed?: { power: number; hourPower: number };
}

const KIT_KG = 1.5;

export function physicsFor(settings: AthleteSettings): RiderPhysics {
  return { ...DEFAULT_PHYSICS, massKg: settings.weightKg + settings.bikeWeightKg + KIT_KG };
}

export function goalSummary(goal: Goal, hourPower: number, settings: AthleteSettings, today: string, durability = 0.97): GoalSummary {
  const day = today.slice(0, 10);
  const year = Number(day.slice(0, 4));
  const holidays = [christmasWindow(year - 1), christmasWindow(year), christmasWindow(year + 1)];
  const phases = periodise(day, goal.date, { holidays });
  const daysToGo = Math.round((Date.parse(`${goal.date}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000);
  const summary: GoalSummary = {
    goal,
    phases,
    phase: phaseOn(phases, day),
    daysToGo,
    weeksToGo: Math.ceil(daysToGo / 7),
    targetHourPower: goal.targetWatts ?? Math.ceil(((goal.startHourPower ?? hourPower) * 1.1) / 5) * 5,
  };
  const ev = goal.event;
  if (ev && ev.distanceKm > 0) {
    const physics = physicsFor(settings);
    summary.predicted = predictEvent(ev.distanceKm, ev.climbingM, hourPower, physics, durability);
    if (ev.targetMinutes) {
      const power = powerForTarget(ev.distanceKm, ev.climbingM, ev.targetMinutes * 60, physics);
      const needHp = Math.round(power / sustainableFraction(ev.targetMinutes / 60, durability));
      summary.needed = { power, hourPower: needHp };
      if (!goal.targetWatts) summary.targetHourPower = needHp;
    }
  }
  return summary;
}
