import { readJson, writeJson } from "@/lib/data/store";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import type { PhaseName } from "@/lib/plan/periodise";
import { fuelFor, STRENGTH, type PlannedSession, type WeekPlan } from "@/lib/plan/week";

/**
 * One-tap check-in before the day's training. It changes that day only:
 * tired turns quality into easy riding, short on time shrinks the session.
 * Nothing is moved to another day.
 */

export type Mood = "good" | "tired" | "short";
export const MOODS: Mood[] = ["good", "tired", "short"];

const FILE = "checkins.json";

export function loadCheckIns(): Record<string, Mood> {
  return readJson<Record<string, Mood>>(FILE, {});
}

export function saveCheckIn(date: string, mood: Mood | null): void {
  const all = loadCheckIns();
  if (mood) all[date] = mood;
  else delete all[date];
  writeJson(FILE, all);
}

function rideAs(s: PlannedSession, id: string, minutes: number, phase: PhaseName): PlannedSession {
  const ride = scaleWorkout(getWorkout(id), minutes);
  return { ...s, ride, minutes: ride.minutes, fuel: fuelFor(ride.minutes, phase, ride.workout.intensity) };
}

export function applyCheckIn(s: PlannedSession, mood: Mood, phase: PhaseName): PlannedSession {
  if (mood === "good") return s;
  if (s.strength) {
    if (s.strength === STRENGTH.heavy) {
      return {
        ...s,
        strength: STRENGTH.maintenance,
        minutes: Math.min(s.minutes, 30),
        adjusted: mood === "tired" ? "Lighter today: half the sets, nothing to failure." : "Shortened to the essentials.",
      };
    }
    return mood === "short" ? { ...s, minutes: Math.min(s.minutes, 25), adjusted: "Shortened to the essentials." } : s;
  }
  if (!s.ride) return s;
  const long = s.minutes >= 120;
  if (mood === "tired") {
    // Easy aerobic riding still counts; hard efforts on a tired day mostly add fatigue (E1, E8).
    const minutes = Math.max(30, Math.round((s.minutes * (long ? 0.75 : 0.7)) / 5) * 5);
    return { ...rideAs(s, "endurance", minutes, phase), adjusted: "Tired: swapped for easy riding. Skipping is fine too." };
  }
  // Short on time: keep the session's purpose, cut its length.
  const minutes = long ? 90 : 45;
  if (s.minutes <= minutes) return s;
  const adjusted = "Short on time: cut to fit, the key efforts kept.";
  if (s.ride.workout.minMinutes > minutes) return { ...rideAs(s, "endurance", minutes, phase), adjusted: "Short on time: a shorter steady ride instead." };
  const ride = scaleWorkout(s.ride.workout, minutes);
  return { ...s, ride, minutes: ride.minutes, fuel: fuelFor(ride.minutes, phase, ride.workout.intensity), adjusted };
}

export function applyCheckIns(week: WeekPlan, checkIns: Record<string, Mood>): WeekPlan {
  return { ...week, sessions: week.sessions.map((s) => (checkIns[s.date] ? applyCheckIn(s, checkIns[s.date], week.phase) : s)) };
}
