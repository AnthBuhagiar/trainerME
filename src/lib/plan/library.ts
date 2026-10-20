/**
 * Workout library. Every workout is data with its evidence attached (IDs refer
 * to docs/training-science.md), so the app can always say why a session was
 * chosen. Targets are fractions of the rider's hour power.
 */

export type Purpose =
  | "recovery"
  | "endurance"
  | "tempo"
  | "sweetspot"
  | "threshold"
  | "vo2"
  | "durability"
  | "sprint";

/** Intensity class for the weekly easy/hard balance (E1). */
export type Intensity = "easy" | "moderate" | "hard";

export interface Effort {
  seconds: number;
  /** Target range as fractions of hour power, e.g. [0.95, 1.0]. */
  target: [number, number];
}

export interface MainSet {
  /** Number of sets; each set is `reps` repetitions of work + rest. */
  sets: number;
  minSets: number;
  reps: number;
  work: Effort;
  rest: Effort;
  /** Easy riding between sets. */
  betweenSets?: Effort;
}

export interface Workout {
  id: string;
  name: string;
  purpose: Purpose;
  intensity: Intensity;
  summary: string;
  warmup: Effort;
  main?: MainSet;
  /** Steady riding filling the remaining time (endurance rides). */
  steady?: Effort;
  cooldown: Effort;
  minMinutes: number;
  maxMinutes: number;
  indoorFriendly: boolean;
  evidence: string[];
}

const easy = (seconds: number): Effort => ({ seconds, target: [0.5, 0.65] });
const min = (m: number) => m * 60;

export const LIBRARY: Workout[] = [
  {
    id: "recovery-spin",
    name: "Recovery spin",
    purpose: "recovery",
    intensity: "easy",
    summary: "Very easy riding to loosen the legs without adding fatigue.",
    warmup: easy(min(5)),
    steady: { seconds: min(25), target: [0.45, 0.55] },
    cooldown: easy(min(0)),
    minMinutes: 20,
    maxMinutes: 45,
    indoorFriendly: true,
    evidence: ["E1", "E8"],
  },
  {
    id: "endurance",
    name: "Endurance ride",
    purpose: "endurance",
    intensity: "easy",
    summary: "Steady aerobic riding. The bulk of the week's time (E1).",
    warmup: easy(min(10)),
    steady: { seconds: min(40), target: [0.6, 0.75] },
    cooldown: easy(min(5)),
    minMinutes: 30,
    maxMinutes: 300,
    indoorFriendly: true,
    evidence: ["E1"],
  },
  {
    id: "tempo-3x10",
    name: "3 × 10 min tempo",
    purpose: "tempo",
    intensity: "moderate",
    summary: "Comfortably hard steady blocks that build aerobic strength with modest fatigue.",
    warmup: easy(min(10)),
    main: { sets: 1, minSets: 1, reps: 3, work: { seconds: min(10), target: [0.76, 0.87] }, rest: easy(min(4)) },
    cooldown: easy(min(5)),
    minMinutes: 35,
    maxMinutes: 75,
    indoorFriendly: true,
    evidence: ["E1", "E3"],
  },
  {
    id: "sweetspot-3x12",
    name: "3 × 12 min sweet spot",
    purpose: "sweetspot",
    intensity: "moderate",
    summary: "Just below threshold: lots of quality time for the fatigue it costs.",
    warmup: easy(min(10)),
    main: { sets: 1, minSets: 1, reps: 3, work: { seconds: min(12), target: [0.88, 0.94] }, rest: easy(min(4)) },
    cooldown: easy(min(5)),
    minMinutes: 35,
    maxMinutes: 75,
    indoorFriendly: true,
    evidence: ["E3"],
  },
  {
    id: "threshold-2x15",
    name: "2 × 15 min threshold",
    purpose: "threshold",
    intensity: "hard",
    summary: "Long efforts at hour power: the most direct way to raise it.",
    warmup: easy(min(17)),
    main: { sets: 1, minSets: 1, reps: 2, work: { seconds: min(15), target: [0.97, 1.02] }, rest: easy(min(5)) },
    cooldown: easy(min(8)),
    minMinutes: 35,
    maxMinutes: 75,
    indoorFriendly: true,
    evidence: ["E3"],
  },
  {
    id: "threshold-over-under",
    name: "Over-unders 3 × (3 × 2/1)",
    purpose: "threshold",
    intensity: "hard",
    summary: "Alternating just above and just below hour power; teaches you to recover while working.",
    warmup: easy(min(12)),
    main: {
      sets: 3,
      minSets: 2,
      reps: 3,
      work: { seconds: min(2), target: [0.92, 0.95] },
      rest: { seconds: min(1), target: [1.05, 1.1] },
      betweenSets: easy(min(5)),
    },
    cooldown: easy(min(8)),
    minMinutes: 40,
    maxMinutes: 70,
    indoorFriendly: true,
    evidence: ["E3"],
  },
  {
    id: "vo2-30-15",
    name: "30/15s · 3 × 13",
    purpose: "vo2",
    intensity: "hard",
    summary: "Short-interval VO2 sets (Rønnestad). Hard, but time-efficient.",
    warmup: easy(min(15)),
    main: {
      sets: 3,
      minSets: 2,
      reps: 13,
      work: { seconds: 30, target: [1.2, 1.35] },
      rest: { seconds: 15, target: [0.45, 0.55] },
      betweenSets: easy(min(3)),
    },
    cooldown: easy(min(8)),
    minMinutes: 40,
    maxMinutes: 60,
    indoorFriendly: true,
    evidence: ["E1", "E2"],
  },
  {
    id: "vo2-5x4",
    name: "5 × 4 min VO2",
    purpose: "vo2",
    intensity: "hard",
    summary: "Long VO2 intervals: good outdoors on a steady climb.",
    warmup: easy(min(15)),
    main: { sets: 1, minSets: 1, reps: 5, work: { seconds: min(4), target: [1.06, 1.15] }, rest: easy(min(3)) },
    cooldown: easy(min(8)),
    minMinutes: 45,
    maxMinutes: 70,
    indoorFriendly: true,
    evidence: ["E1", "E2"],
  },
  {
    id: "climb-pace-2x12",
    name: "2 × 12 min steady climb pace",
    purpose: "threshold",
    intensity: "hard",
    summary: "Event-pace climbing efforts that also refresh your hour-power estimate (no test needed).",
    warmup: easy(min(12)),
    main: { sets: 1, minSets: 1, reps: 2, work: { seconds: min(12), target: [0.95, 1.0] }, rest: easy(min(6)) },
    cooldown: easy(min(8)),
    minMinutes: 35,
    maxMinutes: 60,
    indoorFriendly: true,
    evidence: ["E3"],
  },
  {
    id: "long-ride-late-efforts",
    name: "Long ride · efforts in the final hour",
    purpose: "durability",
    intensity: "moderate",
    summary: "Endurance riding with tempo blocks late in the ride to build durability for long events.",
    warmup: easy(min(15)),
    steady: { seconds: min(90), target: [0.6, 0.75] },
    main: { sets: 1, minSets: 1, reps: 3, work: { seconds: min(10), target: [0.82, 0.9] }, rest: easy(min(5)) },
    cooldown: easy(min(10)),
    minMinutes: 120,
    maxMinutes: 330,
    indoorFriendly: false,
    evidence: ["E6", "E7"],
  },
  {
    id: "sprints-6x15s",
    name: "Endurance + 6 × 15 s sprints",
    purpose: "sprint",
    intensity: "easy",
    summary: "Mostly easy, with short sprints to keep top-end snap. Low fatigue.",
    warmup: easy(min(10)),
    main: { sets: 1, minSets: 1, reps: 6, work: { seconds: 15, target: [1.8, 2.5] }, rest: easy(min(3)) },
    cooldown: easy(min(10)),
    minMinutes: 35,
    maxMinutes: 90,
    indoorFriendly: true,
    evidence: ["E1"],
  },
];

const dur = (seconds: number) => (seconds >= 60 ? `${Math.round((seconds / 60) * 10) / 10} min` : `${seconds} s`);

/** Names follow the main set, so a shortened or progressed session says what it really is. */
const TITLES: Record<string, (m: MainSet) => string> = {
  "tempo-3x10": (m) => `${m.reps} × ${dur(m.work.seconds)} tempo`,
  "sweetspot-3x12": (m) => `${m.reps} × ${dur(m.work.seconds)} sweet spot`,
  "threshold-2x15": (m) => `${m.reps} × ${dur(m.work.seconds)} threshold`,
  "threshold-over-under": (m) => `Over-unders ${m.sets} × (${m.reps} × 2/1)`,
  "vo2-30-15": (m) => `30/15s · ${m.sets} × ${m.reps}`,
  "vo2-5x4": (m) => `${m.reps} × ${dur(m.work.seconds)} VO2`,
  "climb-pace-2x12": (m) => `${m.reps} × ${dur(m.work.seconds)} steady climb pace`,
  "long-ride-late-efforts": (m) => `Long ride · ${m.reps} × ${dur(m.work.seconds)} tempo in the final hour`,
  "sprints-6x15s": (m) => `Endurance + ${m.reps} × ${dur(m.work.seconds)} sprints`,
};

function retitle(w: Workout): Workout {
  if (w.main && TITLES[w.id]) w.name = TITLES[w.id](w.main);
  return w;
}

/**
 * Progressive overload across a phase: `step` loading weeks in, long efforts
 * get ~10% longer each week (whole minutes) and short efforts gain a rep, up
 * to four steps. The slot length still wins: scaleWorkout trims to fit.
 */
export function progressWorkout(w: Workout, step: number): Workout {
  const k = Math.max(0, Math.min(4, Math.floor(step)));
  if (!w.main || k === 0) return w;
  const out = structuredClone(w);
  const m = out.main!;
  if (m.work.seconds >= 300) m.work.seconds = Math.round((m.work.seconds * (1 + 0.1 * k)) / 60) * 60;
  else m.reps += k;
  return retitle(out);
}

export function getWorkout(id: string): Workout {
  const w = LIBRARY.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown workout ${id}`);
  return w;
}

/** Rest only between reps (none after the last one), easy riding between sets. */
function mainSetSeconds(m: MainSet, sets = m.sets): number {
  const set = m.reps * m.work.seconds + (m.reps - 1) * m.rest.seconds;
  return sets * set + Math.max(0, sets - 1) * (m.betweenSets?.seconds ?? 0);
}

export function workMinutes(w: Workout): number {
  return w.main ? (w.main.sets * w.main.reps * w.main.work.seconds) / 60 : 0;
}

export function totalMinutes(w: Workout): number {
  const s = w.warmup.seconds + w.cooldown.seconds + (w.main ? mainSetSeconds(w.main) : 0) + (w.steady?.seconds ?? 0);
  return Math.round(s / 60);
}

export interface ScaledWorkout {
  workout: Workout;
  minutes: number;
  /** Share of the original session's training benefit kept (by quality work time). */
  kept: number;
}

/**
 * Fit a workout into the time available ("Less time?"). Warm-up and cool-down
 * shrink first (to a floor), then reps or sets come off; steady riding absorbs
 * any change. Never stretches past maxMinutes.
 */
export function scaleWorkout(w: Workout, minutes: number): ScaledWorkout {
  const target = Math.max(w.minMinutes, Math.min(w.maxMinutes, minutes));
  const original = totalMinutes(w);
  const originalWork = workMinutes(w) || original;
  const out: Workout = structuredClone(w);

  if (out.steady) {
    const fixed = out.warmup.seconds + out.cooldown.seconds + (out.main ? mainSetSeconds(out.main) : 0);
    out.steady.seconds = Math.max(0, target * 60 - fixed);
  } else if (target < original) {
    const over = () => totalMinutes(out) * 60 - target * 60;
    const trim = (e: Effort, floor: number) => (e.seconds = Math.max(floor, e.seconds - Math.max(0, over())));
    // Cut in order of least value lost: warm-up, cool-down, long recoveries, then work.
    trim(out.warmup, min(8));
    trim(out.cooldown, min(4));
    const m = out.main!;
    if (m.rest.seconds >= 120) trim(m.rest, Math.round(m.rest.seconds * 0.6));
    while (over() > 0) {
      if (m.sets > m.minSets) m.sets--;
      else if (m.reps > 1) m.reps--;
      else break;
    }
    // Hand any time freed by a cut back to the warm-up.
    if (over() < 0) out.warmup.seconds -= over();
  }
  retitle(out);

  const kept = out.steady && !out.main ? totalMinutes(out) / original : (workMinutes(out) || totalMinutes(out)) / originalWork;
  return { workout: out, minutes: totalMinutes(out), kept: Math.min(1, Math.round(kept * 100) / 100) };
}

/** Watts for an effort given the rider's hour power. */
export function targetWatts(effort: Effort, hourPower: number): [number, number] {
  return [Math.round(effort.target[0] * hourPower), Math.round(effort.target[1] * hourPower)];
}
