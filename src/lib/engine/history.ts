import type { Ride } from "@/lib/types";
import { daysBetween } from "@/lib/engine/dates";
import { estimateAt, type HourPowerEstimate, type Model } from "@/lib/engine/hourPower";
import { rideEfficiency } from "@/lib/engine/hrEfficiency";

/**
 * Timeline of the hour-power estimate plus a "why it changed" ledger.
 * Each ride is scored by re-estimating with and without it on the same date;
 * the drift between rides is attributed to decay of old evidence.
 */

export interface LedgerEntry {
  date: string;
  rideId: string;
  rideName: string;
  /** Change caused by this ride (W). */
  delta: number;
  /** Change since the previous ride from ageing evidence (W). */
  decay: number;
  reasons: string[];
  after: number;
}

export interface History {
  points: { date: string; hourPower: number; low: number; high: number }[];
  ledger: LedgerEntry[];
  current: HourPowerEstimate | null;
}

const MIN_DURATION_LABEL: Record<number, string> = {
  300: "5-min",
  480: "8-min",
  600: "10-min",
  1200: "20-min",
  1800: "30-min",
};

function explain(model: Model, ride: Ride, before: HourPowerEstimate | null, after: HourPowerEstimate): string[] {
  const reasons: string[] = [];
  for (const point of after.cp?.envelope ?? []) {
    if (point.rideId !== ride.id) continue;
    const prev = before?.cp?.envelope.find((p) => p.duration === point.duration);
    const label = MIN_DURATION_LABEL[point.duration] ?? `${point.duration / 60}-min`;
    if (!prev) reasons.push(`First ${label} effort in the last 90 days: ${Math.round(point.rawPower)} W`);
    else if (point.power > prev.power + 0.5)
      reasons.push(`New ${label} best: ${Math.round(point.rawPower)} W (curve had ${Math.round(prev.power)} W)`);
  }
  const eff = rideEfficiency(ride, model.refHr);
  const snapBefore = before?.hr?.snapshots.find((s) => s.indoor === ride.indoor);
  if (eff && snapBefore) {
    const pct = ((eff.powerAtRefHr - snapBefore.power) / snapBefore.power) * 100;
    if (Math.abs(pct) >= 2) {
      const where = ride.indoor ? "indoor" : "outdoor";
      reasons.push(
        `Power at ${model.refHr} bpm: ${Math.round(eff.powerAtRefHr)} W vs ${Math.round(snapBefore.power)} W ` +
          `${where} 6-week average (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)`,
      );
    }
  }
  return reasons;
}

export function buildHistory(model: Model, asOf: string): History {
  const points: History["points"] = [];
  const ledger: LedgerEntry[] = [];
  let prevAfter: HourPowerEstimate | null = null;
  const rides = model.rides.filter((r) => daysBetween(r.startLocal, asOf) >= 0);
  for (let i = 0; i < rides.length; i++) {
    const ride = rides[i];
    const before = estimateAt(model, rides.slice(0, i), ride.startLocal);
    const after = estimateAt(model, rides.slice(0, i + 1), ride.startLocal);
    if (!after) continue;
    points.push({ date: ride.startLocal, hourPower: after.hourPower, low: after.low, high: after.high });
    const delta = before ? after.hourPower - before.hourPower : 0;
    const decay = before && prevAfter ? before.hourPower - prevAfter.hourPower : 0;
    const reasons = explain(model, ride, before, after);
    if (Math.abs(delta) >= 0.5 || reasons.length) {
      ledger.push({ date: ride.startLocal, rideId: ride.id, rideName: ride.name, delta, decay, reasons, after: after.hourPower });
    }
    prevAfter = after;
  }
  const current = estimateAt(model, rides, asOf);
  if (current) points.push({ date: asOf, hourPower: current.hourPower, low: current.low, high: current.high });
  return { points, ledger: ledger.reverse(), current };
}
