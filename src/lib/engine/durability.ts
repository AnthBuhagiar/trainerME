import type { Ride } from "@/lib/types";
import { daysBetween } from "@/lib/engine/dates";

/**
 * Durability: how well power holds up late in long rides. It decides how close
 * hour power sits to critical power. Riders who fade get a lower factor.
 */

const LONG_RIDE_SECONDS = 2.5 * 3600;
const WINDOW_DAYS = 120;
const DEFAULT_FACTOR = 0.97;

function best20(minutes: [number, number][]): number {
  if (minutes.length < 20) return 0;
  let s = 0;
  for (let i = 0; i < 20; i++) s += minutes[i][0];
  let best = s;
  for (let i = 20; i < minutes.length; i++) {
    s += minutes[i][0] - minutes[i - 20][0];
    best = Math.max(best, s);
  }
  return best / 20;
}

export interface Durability {
  /** Multiplier applied to the modelled 60-min power (0.94-1.00). */
  factor: number;
  /** Median ratio of best late-ride 20 min to best early-ride 20 min. */
  ratio: number | null;
  rides: number;
}

export function durabilityAt(rides: Ride[], asOf: string): Durability {
  const ratios: number[] = [];
  for (const ride of rides) {
    const age = daysBetween(ride.startLocal, asOf);
    if (age < 0 || age > WINDOW_DAYS || ride.movingTime < LONG_RIDE_SECONDS) continue;
    const minutes = ride.streams?.minutes;
    if (!minutes || minutes.length < 120) continue;
    const cut = Math.floor(minutes.length * 0.6);
    const early = best20(minutes.slice(0, cut));
    const late = best20(minutes.slice(cut));
    if (early > 0 && late > 0) ratios.push(late / early);
  }
  if (!ratios.length) return { factor: DEFAULT_FACTOR, ratio: null, rides: 0 };
  ratios.sort((a, b) => a - b);
  const ratio = ratios[Math.floor(ratios.length / 2)];
  // 0.80 or lower = big fade (0.94); 1.00 or higher = no fade (1.00).
  const t = Math.min(1, Math.max(0, (ratio - 0.8) / 0.2));
  return { factor: 0.94 + 0.06 * t, ratio, rides: ratios.length };
}
