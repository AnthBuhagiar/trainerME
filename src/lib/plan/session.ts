import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { loadState } from "@/lib/plan/current";
import { mondayOf } from "@/lib/plan/periodise";
import { fuelFor } from "@/lib/plan/week";

/** Find a planned session by date (and start time), optionally shortened to `minutes`. */
export function resolveSession(date: string, start?: string, minutes?: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const state = loadState();
  const week = state.week(mondayOf(date));
  const planned = week.sessions.find((s) => s.date === date && (!start || s.start === start)) ?? week.sessions.find((s) => s.date === date);
  if (!planned) return null;
  let session = planned;
  if (planned.ride && minutes) {
    const ride = scaleWorkout(getWorkout(planned.ride.workout.id), Number(minutes));
    session = { ...planned, ride, minutes: ride.minutes, fuel: fuelFor(ride.minutes, week.phase, ride.workout.intensity) };
  }
  return { state, week, planned, session, hourPower: state.current ? Math.round(state.current.hourPower) : 0 };
}
