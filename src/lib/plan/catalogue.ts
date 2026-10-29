/**
 * Workout catalogue: every workout Hour Power can prescribe, grouped into
 * families of variations, with the phases and plan roles each one suits and
 * the study protocol it comes from.
 *
 * The workouts themselves (steps and targets) live in library.ts; this file is
 * the index over them. The planner's current menus (MENU in protocol.ts) pick
 * from this catalogue, and catalogue.test.ts checks the two stay in step.
 * docs/workout-library.md is generated from this file (see catalogue.test.ts).
 *
 * Intensities from studies that used peak aerobic power (the top of a ramp
 * test) are converted with hour power ≈ 75% of peak aerobic power. That ratio
 * is a coaching rule of thumb, not a measured value, and is labelled as such.
 */

import type { PhaseName } from "@/lib/plan/periodise";

/** Where a workout can sit in a week (P1–P12). */
export type Role =
  | "key" // first quality session of the week
  | "second" // second quality session (P1)
  | "dayAfter" // easier option the day after the key session (P8)
  | "long" // the weekly long ride (P10)
  | "easy" // easy riding days (P2)
  | "comeback" // after missed training (P13)
  | "taper"; // the last two weeks (P11)

export type Confidence = "Strong" | "Moderate" | "Practice" | "Low–moderate";

export interface FamilyInfo {
  id: string;
  name: string;
  /** What the family trains, in plain words. */
  aim: string;
  /** How a rider moves through the variations. */
  progression: string;
}

export interface CatalogueEntry {
  /** Workout id in library.ts. */
  id: string;
  family: string;
  /** 1 = easiest variation in its family. */
  level: number;
  phases: PhaseName[];
  roles: Role[];
  /** The study protocol (or practice) this variation is taken from. */
  source: string;
  confidence: Confidence;
}

export const FAMILIES: FamilyInfo[] = [
  { id: "easy", name: "Easy and endurance", aim: "The bulk of the week's riding: aerobic base with little fatigue (E1).", progression: "Longer, not harder. The slot length sets the duration." },
  { id: "sprints", name: "Sprints", aim: "Top-end snap and very high power for short bursts.", progression: "6 × 15 s inside an easy ride, then 12 × 30 s near-all-out as a hard session." },
  { id: "tempo", name: "Tempo", aim: "Aerobic strength at 76–87% of hour power, cheap to recover from.", progression: "3 × 10 → 2 × 20 min." },
  { id: "sweetspot", name: "Sweet spot", aim: "Lots of time at 88–94% of hour power for the fatigue it costs.", progression: "3 × 12 → 4 × 10 → 2 × 20 → 3 × 15 min." },
  { id: "threshold", name: "Threshold", aim: "Raise hour power directly with long efforts at 97–102% of it.", progression: "3 × 10 → 2 × 15 → 2 × 20 min, with over-unders as the variety option." },
  { id: "supra", name: "Just above hour power", aim: "Five-minute efforts at 102–110% of hour power with short breaks.", progression: "6 × 5 → 8 × 5 min (Lindsay and Hawley's range)." },
  { id: "vo2-short", name: "VO2 · short intervals (30/15s)", aim: "Time at a high share of VO2max from short work and shorter rest. The main VO2 format (P4).", progression: "2 × 10 → 3 × 10 → 3 × 13 (the Rønnestad session)." },
  { id: "vo2-long", name: "VO2 · long intervals", aim: "Four- and five-minute efforts above hour power. Good outdoors on a steady climb.", progression: "4 × 4 → 5 × 4 → 4 × 5 → 8 × 4 min." },
  { id: "climb", name: "Event climbing pace", aim: "Efforts at the power the goal needs; they also refresh the hour-power estimate.", progression: "2 × 12 → 3 × 10 → 2 × 20 min." },
  { id: "durability", name: "Long ride with late efforts", aim: "Holding power when already tired, for long events (E6), with fuel practice (E7).", progression: "Tempo → sweet spot → climb pace in the final hour." },
  { id: "taper", name: "Taper sharpeners", aim: "Keep intensity while volume drops before the event (E4).", progression: "Openers in taper week 1 and event week; one set of 30/15s for a rider used to them." },
];

const RONNESTAD = "Rønnestad et al. 2015 (and 2020, elite): 3 × 13 × 30 s on / 15 s off, twice a week for 10 weeks, beat effort-matched 4 × 5 min";
const RONNESTAD_LONG = "Rønnestad et al. 2015: the long-interval comparison group, 4 × 5 min with 2.5 min recovery";
const STEPTO_4 = "Stepto et al. 1999: 8 × 4 min at 85% of peak aerobic power (≈113% of hour power) was one of the two formats that improved 40 km time trials most";
const STEPTO_30 = "Stepto et al. 1999: 12 × 30 s at 175% of peak aerobic power was the other format that improved 40 km time trials; 60 s, 2 min and 8 min formats did not";
const LINDSAY = "Lindsay, Hawley et al. 1996: 6–8 × 5 min at 80% of peak aerobic power (≈107% of hour power), 60 s recovery, added to base training, improved 40 km time trials";
const POLARISED = "Neal et al. 2013; Stöggl & Sperlich 2014: most riding easy, with the hard work kept hard";
const PRACTICE_E3 = "Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs";
const MAUNDER = "Maunder et al. 2021: what matters in long events is how much power falls late in the ride";
const BOSQUET = "Bosquet et al. 2007 meta-analysis: keep intensity, cut volume 41–60% over about two weeks";

export const CATALOGUE: CatalogueEntry[] = [
  // Easy and endurance
  { id: "recovery-spin", family: "easy", level: 1, phases: ["base", "build", "specific", "taper", "flex"], roles: ["easy", "comeback"], source: "Recovery weeks and easy days (E8); " + POLARISED, confidence: "Practice" },
  { id: "endurance", family: "easy", level: 2, phases: ["base", "build", "specific", "taper", "flex"], roles: ["easy", "long", "comeback"], source: POLARISED, confidence: "Moderate" },
  // Sprints
  { id: "sprints-6x15s", family: "sprints", level: 1, phases: ["base", "build", "specific", "taper"], roles: ["dayAfter", "second", "easy", "comeback", "taper"], source: "Practice: short sprints keep top-end power with almost no fatigue, so the day stays easy (E1)", confidence: "Practice" },
  { id: "sprint-intervals-12x30", family: "sprints", level: 2, phases: ["build", "specific"], roles: ["second"], source: STEPTO_30, confidence: "Moderate" },
  // Tempo
  { id: "tempo-3x10", family: "tempo", level: 1, phases: ["base"], roles: ["second"], source: PRACTICE_E3 + "; the pyramidal base of Filipas et al. 2022", confidence: "Practice" },
  { id: "tempo-2x20", family: "tempo", level: 2, phases: ["base"], roles: ["second"], source: PRACTICE_E3 + "; the pyramidal base of Filipas et al. 2022", confidence: "Practice" },
  // Sweet spot
  { id: "sweetspot-3x12", family: "sweetspot", level: 1, phases: ["base"], roles: ["second", "dayAfter"], source: PRACTICE_E3, confidence: "Practice" },
  { id: "sweetspot-4x10", family: "sweetspot", level: 2, phases: ["base"], roles: ["second", "dayAfter"], source: PRACTICE_E3, confidence: "Practice" },
  { id: "sweetspot-2x20", family: "sweetspot", level: 3, phases: ["base"], roles: ["second"], source: PRACTICE_E3, confidence: "Practice" },
  { id: "sweetspot-3x15", family: "sweetspot", level: 4, phases: ["base"], roles: ["second"], source: PRACTICE_E3, confidence: "Practice" },
  // Threshold
  { id: "threshold-3x10", family: "threshold", level: 1, phases: ["base", "build"], roles: ["key", "second"], source: PRACTICE_E3, confidence: "Practice" },
  { id: "threshold-2x15", family: "threshold", level: 2, phases: ["base", "build", "specific"], roles: ["key", "second"], source: PRACTICE_E3, confidence: "Practice" },
  { id: "threshold-2x20", family: "threshold", level: 3, phases: ["base", "build", "specific"], roles: ["key", "second"], source: PRACTICE_E3, confidence: "Practice" },
  { id: "threshold-over-under", family: "threshold", level: 4, phases: ["base", "build"], roles: ["key", "second"], source: PRACTICE_E3 + "; variety within the threshold block (P5)", confidence: "Practice" },
  // Just above hour power
  { id: "supra-6x5", family: "supra", level: 1, phases: ["base", "build"], roles: ["key", "second"], source: LINDSAY, confidence: "Moderate" },
  { id: "supra-8x5", family: "supra", level: 2, phases: ["build", "specific"], roles: ["key", "second"], source: LINDSAY, confidence: "Moderate" },
  // VO2 short
  { id: "vo2-30-15-2x10", family: "vo2-short", level: 1, phases: ["base", "build"], roles: ["key", "second"], source: RONNESTAD + " (entry dose)", confidence: "Moderate" },
  { id: "vo2-30-15-3x10", family: "vo2-short", level: 2, phases: ["build", "specific"], roles: ["key", "second"], source: RONNESTAD + " (one step short)", confidence: "Moderate" },
  { id: "vo2-30-15", family: "vo2-short", level: 3, phases: ["build", "specific"], roles: ["key", "second"], source: RONNESTAD, confidence: "Moderate" },
  // VO2 long
  { id: "vo2-4x4", family: "vo2-long", level: 1, phases: ["build", "specific"], roles: ["key", "second"], source: "Practice: entry to long VO2 intervals before 5 × 4 (E2)", confidence: "Practice" },
  { id: "vo2-5x4", family: "vo2-long", level: 2, phases: ["build", "specific"], roles: ["key", "second"], source: "Rønnestad et al. 2015 long-interval format, in 4-minute pieces (E2)", confidence: "Moderate" },
  { id: "vo2-4x5", family: "vo2-long", level: 3, phases: ["build", "specific"], roles: ["key", "second"], source: RONNESTAD_LONG, confidence: "Moderate" },
  { id: "vo2-8x4", family: "vo2-long", level: 4, phases: ["build", "specific"], roles: ["key", "second"], source: STEPTO_4, confidence: "Moderate" },
  // Event climbing pace
  { id: "climb-pace-2x12", family: "climb", level: 1, phases: ["specific", "taper"], roles: ["key"], source: PRACTICE_E3 + "; specificity: work close to race pace improved 1-hour performance (Stepto et al. 1999)", confidence: "Practice" },
  { id: "climb-pace-3x10", family: "climb", level: 2, phases: ["specific"], roles: ["key"], source: PRACTICE_E3 + "; specificity (Stepto et al. 1999)", confidence: "Practice" },
  { id: "climb-pace-2x20", family: "climb", level: 3, phases: ["specific"], roles: ["key"], source: PRACTICE_E3 + "; specificity (Stepto et al. 1999)", confidence: "Practice" },
  // Long ride with late efforts
  { id: "long-ride-late-efforts", family: "durability", level: 1, phases: ["build", "specific"], roles: ["long"], source: MAUNDER, confidence: "Moderate" },
  { id: "long-ride-late-sweetspot", family: "durability", level: 2, phases: ["build", "specific"], roles: ["long"], source: MAUNDER, confidence: "Moderate" },
  { id: "long-ride-late-climb-pace", family: "durability", level: 3, phases: ["specific"], roles: ["long"], source: MAUNDER + "; event rehearsal at goal power", confidence: "Moderate" },
  // Taper
  { id: "taper-openers", family: "taper", level: 1, phases: ["taper"], roles: ["key", "taper"], source: BOSQUET, confidence: "Strong" },
  { id: "taper-30-15", family: "taper", level: 2, phases: ["taper"], roles: ["second", "taper"], source: BOSQUET + "; " + RONNESTAD, confidence: "Strong" },
];

export function catalogueEntry(id: string): CatalogueEntry | undefined {
  return CATALOGUE.find((e) => e.id === id);
}

/** Variations in a family, easiest first. */
export function variations(family: string): CatalogueEntry[] {
  return CATALOGUE.filter((e) => e.family === family).sort((a, b) => a.level - b.level);
}

/** The next variation up (or down) in the same family, if there is one. */
export function stepVariation(id: string, by: 1 | -1): CatalogueEntry | undefined {
  const e = catalogueEntry(id);
  if (!e) return undefined;
  return variations(e.family).find((x) => x.level === e.level + by);
}

/** Workouts that suit a phase and a role, easiest first within each family. */
export function candidates(phase: PhaseName, role: Role): CatalogueEntry[] {
  return CATALOGUE.filter((e) => e.phases.includes(phase) && e.roles.includes(role)).sort((a, b) =>
    a.family === b.family ? a.level - b.level : FAMILIES.findIndex((f) => f.id === a.family) - FAMILIES.findIndex((f) => f.id === b.family),
  );
}

// ---- Strength (P9, E5) ----

export interface StrengthVariation {
  id: string;
  name: string;
  phases: PhaseName[];
  /** Sessions a week. */
  perWeek: number;
  /** One line per weekly session. */
  sessions: string[];
  exercises: string[];
  notes: string;
  source: string;
  confidence: Confidence;
}

const RONNESTAD_LIFTS = ["Half squat (Smith machine)", "Leg press, one leg at a time", "One-legged hip flexion", "Calf raise"];
const RONNESTAD_STRENGTH =
  "Rønnestad, Hansen & Raastad (2010, 2017) and Rønnestad & Mujika 2014: four lower-body lifts, 3 × 4–10RM, twice a week, heavy load rising every few weeks";

export const STRENGTH_PROGRAM: StrengthVariation[] = [
  {
    id: "strength-heavy-1",
    name: "Heavy strength · weeks 1–3",
    phases: ["base"],
    perWeek: 2,
    sessions: ["Session A: 3 × 10RM", "Session B: 3 × 6RM"],
    exercises: RONNESTAD_LIFTS,
    notes: "About 2 min between sets. Lift fast, lower slowly. Start lighter than 10RM in week 1 if new to lifting.",
    source: RONNESTAD_STRENGTH,
    confidence: "Moderate",
  },
  {
    id: "strength-heavy-2",
    name: "Heavy strength · weeks 4–6",
    phases: ["base", "build"],
    perWeek: 2,
    sessions: ["Session A: 3 × 8RM", "Session B: 3 × 5RM"],
    exercises: RONNESTAD_LIFTS,
    notes: "About 2 min between sets. Lift fast, lower slowly.",
    source: RONNESTAD_STRENGTH,
    confidence: "Moderate",
  },
  {
    id: "strength-heavy-3",
    name: "Heavy strength · weeks 7 on",
    phases: ["base", "build"],
    perWeek: 2,
    sessions: ["Session A: 3 × 6RM", "Session B: 3 × 4RM"],
    exercises: RONNESTAD_LIFTS,
    notes: "About 2 min between sets. Lift fast, lower slowly. Keep off the day before a key ride (P9).",
    source: RONNESTAD_STRENGTH,
    confidence: "Moderate",
  },
  {
    id: "strength-maintenance",
    name: "Strength · maintenance",
    phases: ["specific"],
    perWeek: 2,
    sessions: ["Session A: 2 × 5RM", "Session B: 2 × 4RM"],
    exercises: RONNESTAD_LIFTS,
    notes: "Half the sets at the same heavy load, so strength holds while the riding gets harder. If the week is full, one session is the minimum.",
    source: "Rønnestad & Mujika 2014: maintaining strength in season with less volume at a heavy load",
    confidence: "Moderate",
  },
  {
    id: "strength-mobility",
    name: "Mobility and core",
    phases: ["taper"],
    perWeek: 2,
    sessions: ["Hip and hamstring mobility 10 min, then dead bug, bird dog and side plank · 3 rounds"],
    exercises: ["Hip and hamstring mobility", "Dead bug", "Bird dog", "Side plank"],
    notes: "No heavy leg work in the last 10 days before the event.",
    source: "Practice: strength volume drops in the taper (E4, E5)",
    confidence: "Practice",
  },
];
