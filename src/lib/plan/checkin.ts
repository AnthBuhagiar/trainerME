import { readJson, writeJson } from "@/lib/data/store";
import { addDays, weekdayOf } from "@/lib/plan/calendar";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import type { PhaseName } from "@/lib/plan/periodise";
import { fuelFor, STRENGTH, type PlannedSession, type WeekPlan } from "@/lib/plan/week";

/**
 * One-tap check-in before the day's training. Tired turns quality into easy
 * riding, short on time shrinks the session. A day off moves the training a
 * day later, each session along by one, up to the next free day this week;
 * with no free day left, the day's session is dropped.
 */

export type Mood = "good" | "tired" | "short" | "off";
export const MOODS: Mood[] = ["good", "tired", "short", "off"];

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
  if (mood === "good" || mood === "off") return s;
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

const dayName = (date: string) => new Intl.DateTimeFormat("en-AU", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/**
 * A day off: that day's training moves a day later, and so does each following
 * day's, up to the first free day (no session, not away) later in the week,
 * which takes the last one. No free day left: the day's sessions come out.
 */
export function takeDayOff(week: WeekPlan, date: string, unavailable: (date: string) => boolean = () => false): WeekPlan {
  const end = addDays(week.weekStart, 6);
  if (date < week.weekStart || date > end || !week.sessions.some((s) => s.date === date)) return week;
  let free: string | null = null;
  for (let d = addDays(date, 1); d <= end; d = addDays(d, 1)) {
    if (!week.sessions.some((s) => s.date === d) && !unavailable(d)) {
      free = d;
      break;
    }
  }
  if (!free) {
    return {
      ...week,
      sessions: week.sessions.filter((s) => s.date !== date),
      adaptation: [week.adaptation, `Day off on ${dayName(date)}: no free day left this week, so its session is off the plan.`].filter(Boolean).join(" "),
    };
  }
  const last = free;
  return {
    ...week,
    sessions: week.sessions.map((s) => {
      if (s.date < date || s.date >= last) return s;
      const to = addDays(s.date, 1);
      return { ...s, date: to, weekday: weekdayOf(to), movedFrom: s.movedFrom ?? s.date, adjusted: `Moved a day: day off on ${dayName(date)}.` };
    }),
  };
}

export function applyCheckIns(week: WeekPlan, checkIns: Record<string, Mood>, unavailable?: (date: string) => boolean): WeekPlan {
  // Days off first, in date order, so later check-ins apply to whatever then sits on their day.
  const off = Object.keys(checkIns)
    .filter((d) => checkIns[d] === "off")
    .sort();
  const shifted = off.reduce((w, d) => takeDayOff(w, d, unavailable), week);
  return { ...shifted, sessions: shifted.sessions.map((s) => (checkIns[s.date] ? applyCheckIn(s, checkIns[s.date], shifted.phase) : s)) };
}
