import { targetWatts, type Effort, type Workout } from "@/lib/plan/library";

/**
 * Write a workout in Intervals.icu's plain-text workout format, with absolute
 * watt targets from the rider's hour power. Intervals.icu turns this into a
 * structured workout and passes it on to Garmin Connect.
 */

export function duration(seconds: number): string {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (!m) return `${rest}s`;
  return rest ? `${m}m${rest}s` : `${m}m`;
}

function step(e: Effort, hourPower: number): string {
  const [lo, hi] = targetWatts(e, hourPower);
  return `- ${duration(e.seconds)} ${lo}-${hi}w`;
}

export function workoutText(w: Workout, hourPower: number): string {
  const blocks: string[] = [`Warmup\n${step(w.warmup, hourPower)}`];
  const main: string[] = [];
  if (w.main) {
    const m = w.main;
    for (let set = 0; set < m.sets; set++) {
      // A repeat block includes the recovery after every rep, so the last one is
      // simply the start of the between-sets or cool-down riding.
      const label = m.sets > 1 ? `Set ${set + 1} ${m.reps}x` : `Main set ${m.reps}x`;
      main.push(m.reps > 1 ? `${label}\n${step(m.work, hourPower)}\n${step(m.rest, hourPower)}` : `Main set\n${step(m.work, hourPower)}`);
      if (m.betweenSets && set < m.sets - 1) main.push(`Easy\n${step(m.betweenSets, hourPower)}`);
    }
  }
  const steady = w.steady && w.steady.seconds > 0 ? [`Steady\n${step(w.steady, hourPower)}`] : [];
  blocks.push(...(w.purpose === "durability" ? [...steady, ...main] : [...main, ...steady]));
  if (w.cooldown.seconds > 0) blocks.push(`Cooldown\n${step(w.cooldown, hourPower)}`);
  return blocks.join("\n\n");
}
