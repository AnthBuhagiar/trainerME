import type { Ride } from "@/lib/types";
import { daysBetween } from "@/lib/engine/dates";

/**
 * Heart-rate efficiency: watts produced at a fixed reference heart rate.
 * A rider producing more power at the same heart rate than their own recent
 * history is evidence that threshold has risen, even on an easy ride.
 */

export const EFFICIENCY_WINDOW_DAYS = 42;
const MIN_BLOCK_POWER = 60;
const MIN_BLOCK_HR = 95;
const STEADY_TOLERANCE = 0.15;
const MIN_BLOCKS = 8;

/** Minutes where power was steady relative to the previous minute (HR has settled). */
export function steadyBlocks(minutes: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 1; i < minutes.length; i++) {
    const [p, hr] = minutes[i];
    const prev = minutes[i - 1][0];
    if (p < MIN_BLOCK_POWER || hr < MIN_BLOCK_HR || prev <= 0) continue;
    if (Math.abs(p - prev) / prev <= STEADY_TOLERANCE) out.push([p, hr]);
  }
  return out;
}

/** Median heart rate of steady minutes across all rides, rounded to 5 bpm. */
export function referenceHeartRate(rides: Ride[]): number {
  const hrs: number[] = [];
  for (const ride of rides) {
    for (const [, hr] of steadyBlocks(ride.streams?.minutes ?? [])) hrs.push(hr);
  }
  if (!hrs.length) return 135;
  hrs.sort((a, b) => a - b);
  return Math.round(hrs[Math.floor(hrs.length / 2)] / 5) * 5;
}

export interface RideEfficiency {
  rideId: string;
  date: string;
  indoor: boolean;
  /** Estimated power (W) at the reference heart rate. */
  powerAtRefHr: number;
  blocks: number;
}

/**
 * Least-squares power-vs-HR line through a ride's steady minutes, read at the
 * reference HR. Rides whose HR never came near the reference are skipped
 * rather than extrapolated.
 */
export function rideEfficiency(ride: Ride, refHr: number): RideEfficiency | null {
  const blocks = steadyBlocks(ride.streams?.minutes ?? []);
  if (blocks.length < MIN_BLOCKS) return null;
  const hrs = blocks.map((b) => b[1]);
  const minHr = Math.min(...hrs);
  const maxHr = Math.max(...hrs);
  if (refHr < minHr - 5 || refHr > maxHr + 5) return null;
  const n = blocks.length;
  const mx = hrs.reduce((a, b) => a + b, 0) / n;
  const my = blocks.reduce((a, b) => a + b[0], 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const [p, hr] of blocks) {
    sxx += (hr - mx) ** 2;
    sxy += (hr - mx) * (p - my);
  }
  // With almost no HR spread the slope is meaningless; use the ride's mean ratio.
  const slope = sxx / n >= 9 ? sxy / sxx : 0;
  const powerAtRefHr = slope > 0 ? my + slope * (refHr - mx) : (my / mx) * refHr;
  if (!Number.isFinite(powerAtRefHr) || powerAtRefHr <= 0) return null;
  return { rideId: ride.id, date: ride.startLocal, indoor: ride.indoor, powerAtRefHr, blocks: n };
}

export interface EfficiencySnapshot {
  indoor: boolean;
  /** Block-weighted mean power at reference HR over the trailing window. */
  power: number;
  rides: number;
  blocks: number;
}

/** Trailing-window efficiency for one environment (indoor or outdoor). */
export function efficiencyAt(
  efficiencies: RideEfficiency[],
  asOf: string,
  indoor: boolean,
): EfficiencySnapshot | null {
  let wsum = 0;
  let psum = 0;
  let rides = 0;
  for (const e of efficiencies) {
    if (e.indoor !== indoor) continue;
    const age = daysBetween(e.date, asOf);
    if (age < 0 || age > EFFICIENCY_WINDOW_DAYS) continue;
    wsum += e.blocks;
    psum += e.powerAtRefHr * e.blocks;
    rides++;
  }
  if (!rides) return null;
  return { indoor, power: psum / wsum, rides, blocks: wsum };
}
