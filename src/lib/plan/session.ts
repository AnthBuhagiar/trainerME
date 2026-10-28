import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { loadState } from "@/lib/plan/current";
import { weekStartOf } from "@/lib/plan/periodise";
import { fuelFor, type PlannedSession } from "@/lib/plan/week";

/** Find a planned session by date (and start time), optionally shortened or lengthened to `minutes`. */
export function resolveSession(date: string, start?: string, minutes?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const state = loadState();
  const week = state.week(weekStartOf(date));
  const planned = week.sessions.find((s) => s.date === date && (!start || s.start === start)) ?? week.sessions.find((s) => s.date === date);
  if (!planned) return null;
  let session = planned;
  if (planned.ride && minutes) {
    const m = Number(minutes);
    // Longer keeps the planned main set (with its progression) and adds steady riding; shorter trims from the full workout.
    const ride = scaleWorkout(m > planned.minutes ? planned.ride.workout : getWorkout(planned.ride.workout.id), m);
    session = { ...planned, ride, minutes: ride.minutes, fuel: fuelFor(ride.minutes, week.phase, ride.workout.intensity) };
  }
  return { state, week, planned, session, hourPower: state.targets?.training ?? 0 };
}

/** How short or long this ride can be made before riding it (what the workout allows). */
export function lengthLimits(planned: PlannedSession): { min: number; max: number } | null {
  if (!planned.ride) return null;
  const { minMinutes, maxMinutes } = planned.ride.workout;
  return { min: Math.ceil(minMinutes / 5) * 5, max: Math.floor(maxMinutes / 5) * 5 };
}
