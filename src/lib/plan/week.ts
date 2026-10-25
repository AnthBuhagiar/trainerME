import { getWorkout, progressWorkout, scaleWorkout, type ScaledWorkout } from "@/lib/plan/library";
import { MAX_QUALITY_PER_WEEK, MENU, progressionStep, rotate } from "@/lib/plan/protocol";
import type { Phase, PhaseName } from "@/lib/plan/periodise";
import type { TimeBudget, TimeSlot } from "@/lib/plan/timeBudget";

/**
 * Turn the usual week (time slots) and the current phase into dated sessions.
 * Fixed-day slots stay where they are; flexible ones are spread over the free
 * days. Missed sessions are never carried forward: each week starts clean.
 */

export interface StrengthSession {
  name: string;
  summary: string;
  items: string[];
}

export interface Fuel {
  gramsPerHour: number;
  totalGrams: number;
  note: string;
}

export interface PlannedSession {
  /** YYYY-MM-DD */
  date: string;
  weekday: number;
  start: string;
  minutes: number;
  kind: TimeSlot["kind"];
  indoor: boolean;
  /** Rides only. */
  ride?: ScaledWorkout;
  strength?: StrengthSession;
  fuel?: Fuel;
  /** Why this session sits here, in plain words. */
  why: string;
  /** Set when a check-in changed this session. */
  adjusted?: string;
}

export interface WeekPlan {
  monday: string;
  phase: PhaseName;
  label: string;
  recovery: boolean;
  sessions: PlannedSession[];
}

export const STRENGTH: Record<"heavy" | "maintenance" | "mobility", StrengthSession> = {
  heavy: {
    name: "Heavy strength",
    summary: "Few reps, heavy weight, full rest. Builds force without much bulk (E5).",
    items: ["Back squat or leg press · 4 × 4–6", "Romanian deadlift · 3 × 6", "Single-leg step-up · 3 × 6 each", "Plank and side plank · 3 × 40 s"],
  },
  maintenance: {
    name: "Strength · maintenance",
    summary: "Keep the strength you built with half the sets, so the legs stay fresh for riding.",
    items: ["Back squat or leg press · 2 × 4", "Romanian deadlift · 2 × 5", "Core circuit · 2 rounds"],
  },
  mobility: {
    name: "Mobility and core",
    summary: "No heavy leg work in the last 10 days before the event. Stay loose.",
    items: ["Hip and hamstring mobility · 10 min", "Dead bug, bird dog, side plank · 3 rounds"],
  },
};

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (date: string, n: number) => iso(Date.parse(`${date}T00:00:00Z`) + n * DAY);

/** Carbohydrate target by ride length and phase (E7). */
export function fuelFor(minutes: number, phase: PhaseName, intensity: "easy" | "moderate" | "hard"): Fuel | undefined {
  if (minutes < 75) return undefined;
  const hours = minutes / 60;
  let g: number;
  if (hours <= 2.5) g = intensity === "easy" ? 40 : 60;
  else g = phase === "specific" || phase === "taper" ? 90 : phase === "build" ? 75 : 60;
  const note =
    g > 60
      ? "Use a glucose + fructose mix (about 2:1) above 60 g/h. Practising this is training your gut for the event."
      : "Start eating in the first 30 minutes, then little and often.";
  return { gramsPerHour: g, totalGrams: Math.round((g * hours) / 10) * 10, note };
}

function circularGap(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 7 - d);
}

/** Place every slot on a day of the week. */
function placeSlots(slots: TimeSlot[]): { slot: TimeSlot; weekday: number }[] {
  const placed = slots.filter((s) => s.weekday >= 0).map((slot) => ({ slot, weekday: slot.weekday }));
  const rides = placed.filter((p) => p.slot.kind === "ride");
  const longDay = rides.length ? rides.reduce((a, b) => (b.slot.minutes > a.slot.minutes ? b : a)).weekday : -1;
  const flexible = slots.filter((s) => s.weekday < 0).flatMap((s) => Array.from({ length: s.perWeek }, () => s));
  for (const slot of flexible) {
    const used = new Set(placed.map((p) => p.weekday));
    const free = [0, 1, 2, 3, 4, 5, 6].filter((d) => !used.has(d));
    if (!free.length) break;
    const same = placed.filter((p) => p.slot.kind === slot.kind).map((p) => p.weekday);
    const score = (d: number) => {
      // Spread sessions of the same kind out, and keep heavy legs off the day before a ride (E5):
      // worst before a weeknight quality ride, less bad before the long, mostly steady, ride.
      let s = same.length ? Math.min(3, ...same.map((x) => circularGap(x, d))) : 3;
      const next = (d + 1) % 7;
      if (slot.kind === "strength" && next === longDay) s -= 1.5;
      else if (slot.kind === "strength" && rides.some((r) => r.weekday === next)) s -= 2;
      return s;
    };
    const day = free.reduce((best, d) => (score(d) > score(best) ? d : best));
    placed.push({ slot, weekday: day });
  }
  return placed.sort((a, b) => a.weekday - b.weekday || a.slot.start.localeCompare(b.slot.start));
}

export interface WeekContext {
  monday: string;
  phase: Phase | null;
  /** Days from this Monday to the goal, if any (for the last taper week). */
  daysToGoal?: number;
  /** Set on the month's extended long-ride week: the long ride's length in minutes. */
  extendedLongRide?: number;
}

/** Once a month a longer long ride; this many minutes. */
export const EXTENDED_LONG_RIDE_MINUTES = 210;

/**
 * Mondays of the extended long-ride weeks: about once a month, at least four
 * weeks apart, in base, build or event-specific loading weeks. Recovery,
 * holiday and taper weeks are skipped, so the ride moves to the next week.
 */
export function extendedLongRideWeeks(phases: Phase[]): Set<string> {
  const out = new Set<string>();
  let last = "";
  for (const p of phases) {
    if (p.name === "flex" || p.name === "taper") continue;
    for (let m = p.start; m <= p.end; m = addDays(m, 7)) {
      if (p.recoveryWeeks.includes(m) || (last && m < addDays(last, 28))) continue;
      out.add(m);
      last = m;
    }
  }
  return out;
}

export function planWeek(budget: TimeBudget, ctx: WeekContext): WeekPlan {
  const name: PhaseName = ctx.phase?.name ?? "base";
  const recovery = !!ctx.phase?.recoveryWeeks.includes(ctx.monday);
  const finalWeek = ctx.daysToGoal !== undefined && ctx.daysToGoal < 7;
  const label = recovery ? "Recovery week" : ctx.phase ? ctx.phase.label : "Lead-in week";
  const placed = placeSlots(budget.slots);
  // Loading weeks already done in this phase drive progression; recovery and taper weeks don't progress.
  let step = 0;
  if (ctx.phase && !recovery && name !== "taper" && name !== "flex") {
    for (let m = ctx.phase.start; m < ctx.monday; m = addDays(m, 7)) if (!ctx.phase.recoveryWeeks.includes(m)) step++;
  }

  const rideDays = placed.filter((p) => p.slot.kind === "ride");
  const long = rideDays.length ? rideDays.reduce((a, b) => (b.slot.minutes > a.slot.minutes ? b : a)) : null;
  let qualityIndex = 0;
  let lastQualityDay = -9;

  const sessions: PlannedSession[] = [];
  for (const { slot, weekday } of placed) {
    const date = addDays(ctx.monday, weekday);
    if (ctx.daysToGoal !== undefined && weekday >= ctx.daysToGoal) continue; // event day and beyond belong to the event
    const indoor = slot.indoorShare >= 0.5;
    const base = { date, weekday, start: slot.start, kind: slot.kind, indoor };

    if (slot.kind === "strength") {
      const s = name === "taper" ? STRENGTH.mobility : name === "specific" || recovery ? STRENGTH.maintenance : STRENGTH.heavy;
      const minutes = s === STRENGTH.heavy ? slot.minutes : Math.min(slot.minutes, 35);
      sessions.push({ ...base, minutes, strength: s, why: s === STRENGTH.heavy ? "Two strength sessions a week for every rider (E5)." : s.summary });
      continue;
    }
    if (slot.kind !== "ride") {
      sessions.push({ ...base, minutes: slot.minutes, why: "Part of your usual week." });
      continue;
    }

    // Volume: recovery weeks ~70%, taper ~60% then ~45% in the final week (E4, E8).
    const volume = finalWeek ? 0.45 : name === "taper" ? 0.6 : recovery ? 0.7 : 1;
    let minutes = Math.max(30, Math.round((slot.minutes * volume) / 5) * 5);
    let workoutId: string;
    let why: string;
    if (long && slot === long.slot && slot.minutes >= 120) {
      workoutId = recovery ? "endurance" : MENU[name].long; // P10
      why = workoutId === "endurance" ? "Your long ride: steady aerobic time is the base of hour power (E1)." : "Efforts in the last hour build the durability a long event needs (E6).";
      if (ctx.extendedLongRide && ctx.extendedLongRide > minutes) {
        minutes = ctx.extendedLongRide;
        why = `Once a month the long ride stretches to ${minutes / 60} h: durability and fuelling practice for a long event (E6, E7).`;
      }
    } else if (recovery || name === "flex") {
      workoutId = qualityIndex++ === 0 && recovery ? "sprints-6x15s" : "endurance";
      why = recovery ? "Lighter week so the last three can sink in (E8)." : "Ride if life allows. Nothing to catch up.";
    } else if (qualityIndex < MAX_QUALITY_PER_WEEK) {
      // P3–P5, P8: the phase's rotating menu; the day after the key session is never hard.
      const menu = MENU[name];
      const pick = qualityIndex === 0 ? rotate(menu.key, step) : rotate(menu.second, step);
      const dayAfter = qualityIndex === 1 && weekday - lastQualityDay === 1 && getWorkout(pick).intensity === "hard";
      workoutId = dayAfter ? menu.dayAfter : pick;
      why = qualityIndex === 0 ? "Key session of the week." : dayAfter ? "Day after the key session, so slightly easier." : "Second quality session.";
      qualityIndex++;
      lastQualityDay = weekday;
    } else {
      workoutId = "endurance";
      why = "Keep most riding easy (E1).";
    }
    // P6: progression within the rotation block.
    const k = progressionStep(step, Math.max(MENU[name].key.length, MENU[name].second.length));
    const ride = scaleWorkout(progressWorkout(getWorkout(workoutId), k), minutes);
    sessions.push({ ...base, minutes: ride.minutes, ride, fuel: fuelFor(ride.minutes, name, ride.workout.intensity), why });
  }
  return { monday: ctx.monday, phase: name, label, recovery, sessions };
}
