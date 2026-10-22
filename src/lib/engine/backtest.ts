import { sustainableFraction } from "@/lib/goals/eventTime";
import { estimateAt, type Model } from "@/lib/engine/hourPower";

/**
 * Back-testing (product strategy A5): for every ride that genuinely tested the
 * estimate, compare what the app said *before* that ride with what was ridden.
 * Two kinds of test:
 *  - hour: a ride whose best 60 minutes was close to the estimate (a real effort);
 *  - long: rides of 4 h or more, against the predicted long-ride average power.
 */

export interface HourCheck {
  kind: "hour" | "long";
  date: string;
  rideId: string;
  name: string;
  /** What the app predicted before the ride (W): hour power, or long-ride average. */
  predicted: number;
  low: number;
  high: number;
  actual: number;
  /** actual - predicted (W). */
  error: number;
  /** Riding below the range may just mean it wasn't flat out, so it is "below", not a miss. */
  verdict: "in range" | "above" | "below";
}

export interface Backtest {
  checks: HourCheck[];
  hour: { n: number; medianAbsError: number | null; inRange: number };
  long: { n: number; medianAbsError: number | null };
}

/** A best hour this close to the estimate counts as a real test of it. */
const HARD_HOUR = 0.92;
const LONG_RIDE_S = 4 * 3600;

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function backtest(model: Model): Backtest {
  const checks: HourCheck[] = [];
  const rides = model.rides;
  for (let i = 0; i < rides.length; i++) {
    const ride = rides[i];
    const before = estimateAt(model, rides.slice(0, i), ride.startLocal);
    if (!before || !ride.streams) continue;
    const best60 = ride.streams.powerCurve?.["3600"];
    const base = { date: ride.startLocal, rideId: ride.id, name: ride.name };
    if (best60 && best60 >= HARD_HOUR * before.hourPower) {
      const error = best60 - before.hourPower;
      checks.push({
        ...base,
        kind: "hour",
        predicted: Math.round(before.hourPower),
        low: Math.round(before.low),
        high: Math.round(before.high),
        actual: Math.round(best60),
        error: Math.round(error),
        verdict: best60 > before.high ? "above" : best60 < before.low ? "below" : "in range",
      });
    }
    // Average over moving time (work / moving seconds): the event model predicts moving power, and stops would drag a plain average down.
    if (ride.movingTime >= LONG_RIDE_S && ride.streams.kj) {
      const hours = ride.movingTime / 3600;
      const f = sustainableFraction(hours, before.durability.factor);
      const predicted = before.hourPower * f;
      const actual = (ride.streams.kj * 1000) / ride.movingTime;
      checks.push({
        ...base,
        kind: "long",
        predicted: Math.round(predicted),
        low: Math.round(before.low * f),
        high: Math.round(before.high * f),
        actual: Math.round(actual),
        error: Math.round(actual - predicted),
        verdict: actual > before.high * f ? "above" : actual < before.low * f ? "below" : "in range",
      });
    }
  }
  const hour = checks.filter((c) => c.kind === "hour");
  const long = checks.filter((c) => c.kind === "long");
  return {
    checks: checks.reverse(),
    hour: {
      n: hour.length,
      medianAbsError: median(hour.map((c) => Math.abs(c.error))),
      inRange: hour.filter((c) => c.verdict === "in range").length,
    },
    long: { n: long.length, medianAbsError: median(long.map((c) => Math.abs(c.error))) },
  };
}
