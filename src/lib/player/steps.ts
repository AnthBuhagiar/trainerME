import { targetWatts, type Effort, type Workout } from "@/lib/plan/library";

/** One timed step of a workout as the player runs it. */
export interface PlayerStep {
  label: string;
  seconds: number;
  /** ERG target: middle of the range, rounded to 5 W. */
  watts: number;
  range: [number, number];
  work: boolean;
}

function step(label: string, e: Effort, hourPower: number, work = false): PlayerStep {
  const range = targetWatts(e, hourPower);
  return { label, seconds: e.seconds, watts: Math.round((range[0] + range[1]) / 10) * 5, range, work };
}

/** Expand a workout into every step in order (each rep and recovery separately). */
export function playerSteps(w: Workout, hourPower: number): PlayerStep[] {
  const main: PlayerStep[] = [];
  if (w.main) {
    const m = w.main;
    for (let set = 0; set < m.sets; set++) {
      for (let rep = 0; rep < m.reps; rep++) {
        const name = m.sets > 1 ? `Set ${set + 1} · rep ${rep + 1} of ${m.reps}` : `Rep ${rep + 1} of ${m.reps}`;
        main.push(step(name, m.work, hourPower, true));
        if (rep < m.reps - 1) main.push(step("Recover", m.rest, hourPower, m.rest.target[0] >= 0.76));
      }
      if (m.betweenSets && set < m.sets - 1) main.push(step("Easy between sets", m.betweenSets, hourPower));
    }
  }
  const steady = w.steady && w.steady.seconds > 0 ? [step("Steady", w.steady, hourPower)] : [];
  return [
    step("Warm up", w.warmup, hourPower),
    ...(w.purpose === "durability" ? [...steady, ...main] : [...main, ...steady]),
    ...(w.cooldown.seconds > 0 ? [step("Cool down", w.cooldown, hourPower)] : []),
  ].filter((s) => s.seconds > 0);
}

/** Which step is running after `elapsed` seconds, and how long is left in it. */
export function stepAt(steps: PlayerStep[], elapsed: number): { index: number; remaining: number } | null {
  let t = 0;
  for (let i = 0; i < steps.length; i++) {
    t += steps[i].seconds;
    if (elapsed < t) return { index: i, remaining: t - elapsed };
  }
  return null;
}
