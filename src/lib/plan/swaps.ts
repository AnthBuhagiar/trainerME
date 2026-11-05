import { readJson, writeJson } from "@/lib/data/store";
import { addDays } from "@/lib/plan/calendar";
import { CATALOGUE, catalogueEntry } from "@/lib/plan/catalogue";
import { getWorkout, scaleWorkout, type Intensity, type Workout } from "@/lib/plan/library";
import { fuelFor, type PlannedSession, type WeekPlan } from "@/lib/plan/week";

/**
 * The rider's own pick for a planned ride ("Try something different"). The
 * choice is kept to workouts that keep the week working (P2, P8):
 * - similar: the same kind of work at the same intensity (another threshold
 *   or sweet-spot shape, another VO2 format, another long ride);
 * - easier: always allowed, down to plain endurance;
 * - harder: only when no hard session sits the day before or after.
 * A swapped session is still the planned session: it counts as done, keeps
 * its day and length, and the week moves on as planned.
 */

const FILE = "swaps.json";
type Swaps = Record<string, string>; // "date start" -> workout id
const key = (date: string, start: string) => `${date} ${start}`;

export function loadSwaps(): Swaps {
  return readJson<Swaps>(FILE, {});
}

export function setSwap(date: string, start: string, workoutId: string | null): void {
  const all = loadSwaps();
  if (workoutId) all[key(date, start)] = workoutId;
  else delete all[key(date, start)];
  writeJson(FILE, all);
}

/** Families that do the same job, so one can stand in for another. */
const KIND: Record<string, string> = {
  easy: "easy",
  tempo: "sustained",
  sweetspot: "sustained",
  threshold: "sustained",
  supra: "sustained",
  climb: "sustained",
  "vo2-short": "vo2",
  "vo2-long": "vo2",
  sprints: "sprints",
  durability: "long",
  taper: "taper",
};
const RANK: Record<Intensity, number> = { easy: 0, moderate: 1, hard: 2 };

export interface SwapOption {
  workout: Workout;
  /** How it compares with the planned workout. */
  kind: "similar" | "easier" | "harder";
}

const familyOf = (id: string) => catalogueEntry(id)?.family ?? (getWorkout(id).intensity === "easy" ? "easy" : undefined);

/** What this planned ride could be swapped for. */
export function swapOptions(week: WeekPlan, session: PlannedSession): SwapOption[] {
  const planned = session.swappedFrom ? getWorkout(session.swappedFrom) : session.ride?.workout;
  if (!planned) return [];
  const family = familyOf(planned.id);
  const kind = family ? KIND[family] : undefined;
  const long = kind === "long" || (kind === "easy" && session.minutes >= 150);
  const rank = RANK[planned.intensity];
  const neighbours = [addDays(session.date, -1), addDays(session.date, 1)];
  const hardNearby = week.sessions.some((s) => s !== session && neighbours.includes(s.date) && s.ride?.workout.intensity === "hard");

  const level = catalogueEntry(planned.id)?.level ?? 0;
  const options: SwapOption[] = [];
  for (const e of CATALOGUE) {
    if (e.id === planned.id) continue;
    const w = getWorkout(e.id);
    if (session.indoor && !w.indoorFriendly) continue;
    if (w.minMinutes > session.minutes + 15 || w.maxMinutes < session.minutes - 15) continue; // must fit the day's time
    const theirKind = KIND[e.family];
    const easyRide = e.family === "easy";
    if (long ? !(theirKind === "long" || easyRide) : theirKind === "long") continue;
    if (theirKind === "taper" && week.phase !== "taper") continue;
    const sameKind = theirKind === kind;
    // Within a family, the level says easier or harder; across families, the intensity does.
    const r = RANK[w.intensity];
    const step = e.family === family ? Math.sign(e.level - level) : Math.sign(r - rank);
    const suitsPhase = easyRide || e.phases.includes(week.phase);
    if (step < 0 && (sameKind || easyRide)) options.push({ workout: w, kind: "easier" });
    else if (step === 0 && sameKind && suitsPhase) options.push({ workout: w, kind: "similar" });
    else if (step > 0 && sameKind && suitsPhase && !hardNearby && kind !== "easy") options.push({ workout: w, kind: "harder" });
  }
  // The closest few of each: same family first, then the nearest intensity.
  const closeness = (o: SwapOption) => (familyOf(o.workout.id) === family ? 0 : 1) * 10 + Math.abs(RANK[o.workout.intensity] - rank);
  const LIMIT = { similar: 4, easier: 4, harder: 3 };
  // Plain endurance always stays on the easier list: the way out on a bad day.
  const bail = options.find((o) => o.kind === "easier" && o.workout.id === "endurance");
  return (["similar", "easier", "harder"] as const).flatMap((k) => {
    const sorted = options.filter((o) => o.kind === k && o !== bail).sort((a, b) => closeness(a) - closeness(b));
    // Variety: one per family first, then the rest.
    const seen = new Set<string | undefined>();
    const first = sorted.filter((o) => !seen.has(familyOf(o.workout.id)) && seen.add(familyOf(o.workout.id)));
    const list = [...first, ...sorted.filter((o) => !first.includes(o))];
    return k === "easier" && bail ? [...list.slice(0, LIMIT.easier - 1), bail] : list.slice(0, LIMIT[k]);
  });
}

/** Put the rider's picks into the week, each at its session's length. */
export function applySwaps(week: WeekPlan, swaps: Swaps): WeekPlan {
  if (!week.sessions.some((s) => swaps[key(s.date, s.start)])) return week;
  return {
    ...week,
    sessions: week.sessions.map((s) => {
      const id = swaps[key(s.date, s.start)];
      if (!id || !s.ride || id === s.ride.workout.id) return s;
      let w: Workout;
      try {
        w = getWorkout(id);
      } catch {
        return s; // a workout that no longer exists: keep the plan
      }
      const ride = scaleWorkout(w, s.minutes);
      return { ...s, ride, minutes: ride.minutes, fuel: fuelFor(ride.minutes, week.phase, w.intensity), swappedFrom: s.ride.workout.id };
    }),
  };
}
