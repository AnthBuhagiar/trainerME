import type { RawRideSummary } from "@/lib/data/store";

/**
 * Reduce raw second-by-second Strava streams to a compact ride summary.
 * Mirrors the shape the engine reads (see lib/data/store.ts). Raw streams
 * (and any GPS) are never stored.
 */

export interface RawStreams {
  time?: number[];
  watts?: (number | null)[];
  heartrate?: (number | null)[];
  cadence?: (number | null)[];
  temp?: (number | null)[];
}

export const CURVE_DURATIONS = [5, 15, 30, 60, 120, 300, 480, 600, 1200, 1800, 3600];

/** Expand to 1 Hz, filling recording gaps (pauses) with zeros, as power meters do. */
export function resample(time: number[], values: (number | null)[]): number[] {
  if (!time.length) return [];
  const out = new Array<number>(time[time.length - 1] + 1).fill(0);
  for (let i = 0; i < time.length; i++) out[time[i]] = values[i] ?? 0;
  return out;
}

export function bestAverage(series: number[], window: number): number | null {
  if (series.length < window) return null;
  let sum = 0;
  for (let i = 0; i < window; i++) sum += series[i];
  let best = sum;
  for (let i = window; i < series.length; i++) {
    sum += series[i] - series[i - window];
    if (sum > best) best = sum;
  }
  return Math.round(best / window);
}

export function normalisedPower(power: number[]): number | null {
  if (power.length < 30) return null;
  let sum = 0;
  for (let i = 0; i < 30; i++) sum += power[i];
  let total = (sum / 30) ** 4;
  let n = 1;
  for (let i = 30; i < power.length; i++) {
    sum += power[i] - power[i - 30];
    total += (sum / 30) ** 4;
    n++;
  }
  return Math.round((total / n) ** 0.25);
}

function mean(xs: number[]): number | undefined {
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined;
}

export function summariseStreams(id: string, streams: RawStreams): RawRideSummary {
  const time = streams.time ?? [];
  const summary: RawRideSummary = { id, samples: time.length };
  const watts = streams.watts;
  const hr = streams.heartrate;
  let power: number[] | null = null;

  if (watts && watts.some((w) => w)) {
    power = resample(time, watts);
    summary.avg_watts = Math.round(power.reduce((a, b) => a + b, 0) / power.length);
    summary.np = normalisedPower(power);
    summary.kj = Math.round(power.reduce((a, b) => a + b, 0) / 1000);
    summary.power_curve = Object.fromEntries(CURVE_DURATIONS.map((d) => [String(d), bestAverage(power!, d)]));
  }

  if (hr && hr.some((h) => h)) {
    const valid = hr.filter((h): h is number => !!h);
    summary.avg_hr = mean(valid);
    summary.max_hr = Math.max(...valid);
    if (power) {
      // Per-minute [avg power, avg HR] pairs for the heart-rate efficiency model.
      const h = resample(time, hr);
      const minutes: [number, number][] = [];
      for (let i = 0; i + 60 <= power.length; i += 60) {
        const hrs = h.slice(i, i + 60).filter((x) => x);
        if (hrs.length < 45) continue;
        const p = power.slice(i, i + 60).reduce((a, b) => a + b, 0) / 60;
        minutes.push([Math.round(p), Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)]);
      }
      summary.minutes = minutes;
    }
  }

  const cadence = streams.cadence?.filter((c): c is number => !!c) ?? [];
  if (cadence.length) summary.avg_cadence = mean(cadence);
  const temp = streams.temp?.filter((t): t is number => t !== null && t !== undefined) ?? [];
  if (temp.length) summary.avg_temp = mean(temp);
  return summary;
}
