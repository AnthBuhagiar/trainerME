import type { Ride } from "@/lib/types";
import { daysBetween } from "@/lib/engine/dates";

/**
 * Durations (s) used to fit critical power. Efforts under 3 minutes are excluded:
 * anaerobic capacity inflates threshold estimates (see docs/market-analysis.md).
 */
export const CP_DURATIONS = [300, 480, 600, 1200, 1800] as const;

export const WINDOW_DAYS = 90;
const DECAY_GRACE_DAYS = 21;
const DECAY_PER_WEEK = 0.005;
const DECAY_FLOOR = 0.85;

/** Older best efforts count for less: full value for 3 weeks, then -0.5%/week. */
export function decayFactor(ageDays: number): number {
  if (ageDays <= DECAY_GRACE_DAYS) return 1;
  return Math.max(DECAY_FLOOR, 1 - (DECAY_PER_WEEK * (ageDays - DECAY_GRACE_DAYS)) / 7);
}

export interface EnvelopePoint {
  duration: number;
  /** Decayed power used for the fit. */
  power: number;
  rawPower: number;
  rideId: string;
  rideName: string;
  date: string;
  ageDays: number;
}

/** Best decayed power at each CP duration over the trailing window. */
export function powerEnvelope(rides: Ride[], asOf: string): EnvelopePoint[] {
  const points: EnvelopePoint[] = [];
  for (const duration of CP_DURATIONS) {
    let best: EnvelopePoint | undefined;
    for (const ride of rides) {
      const ageDays = daysBetween(ride.startLocal, asOf);
      if (ageDays < 0 || ageDays > WINDOW_DAYS) continue;
      const raw = ride.streams?.powerCurve?.[String(duration)];
      if (!raw) continue;
      const power = raw * decayFactor(ageDays);
      if (!best || power > best.power) {
        best = { duration, power, rawPower: raw, rideId: ride.id, rideName: ride.name, date: ride.startLocal, ageDays };
      }
    }
    if (best) points.push(best);
  }
  return points;
}

export interface CpFit {
  cp: number;
  wPrime: number;
  /** Envelope points the fit kept (submaximal points are dropped). */
  used: EnvelopePoint[];
}

/** Linear work-time fit: W = CP * t + W'. Returns null when it cannot be fitted. */
function workTimeFit(points: EnvelopePoint[]): { cp: number; wPrime: number } | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.duration);
  const ys = points.map((p) => p.power * p.duration);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (sxx === 0) return null;
  const cp = sxy / sxx;
  return { cp, wPrime: my - cp * mx };
}

/**
 * Two-parameter critical power fit (the 2023 IJSM comparison found 2-parameter
 * fits predict time-to-exhaustion best). Envelope points far below the curve are
 * treated as submaximal (the rider simply never went hard for that duration) and
 * dropped before refitting.
 */
export function fitCriticalPower(envelope: EnvelopePoint[]): CpFit | null {
  let used = [...envelope];
  for (let iter = 0; iter < 3; iter++) {
    const fit = workTimeFit(used);
    if (!fit) return null;
    const kept = used.filter((p) => p.power >= (fit.cp + fit.wPrime / p.duration) * 0.95);
    if (kept.length === used.length || kept.length < 3) break;
    used = kept;
  }
  const fit = workTimeFit(used);
  if (!fit || fit.cp <= 0) return null;
  // A negative W' means the points are flat or inverted (no real hard efforts);
  // fall back to treating the longest kept effort as the sustainable power.
  if (fit.wPrime < 0) {
    const longest = used.reduce((a, b) => (b.duration > a.duration ? b : a));
    return { cp: longest.power, wPrime: 0, used };
  }
  return { cp: fit.cp, wPrime: fit.wPrime, used };
}

/** Predicted maximal power (W) for a duration (s) from a CP fit. */
export function cpPower(fit: { cp: number; wPrime: number }, seconds: number): number {
  return fit.cp + fit.wPrime / seconds;
}
