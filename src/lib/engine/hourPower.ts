import type { Ride } from "@/lib/types";
import { daysBetween } from "@/lib/engine/dates";
import { cpPower, fitCriticalPower, powerEnvelope, type EnvelopePoint } from "@/lib/engine/powerCurve";
import { durabilityAt, type Durability } from "@/lib/engine/durability";
import {
  efficiencyAt,
  referenceHeartRate,
  rideEfficiency,
  type EfficiencySnapshot,
  type RideEfficiency,
} from "@/lib/engine/hrEfficiency";

/**
 * Hour power = the best power the rider could hold for 60 minutes today.
 *
 * Two independent estimates are blended by their uncertainty:
 *  1. Power-duration: a 2-parameter CP fit to the best 5-30 min efforts of the
 *     last 90 days, scaled by durability.
 *  2. Heart-rate efficiency: watts at a reference heart rate over the last 6
 *     weeks, converted to hour power with a ratio calibrated on past dates
 *     when the power-duration evidence was fresh.
 */

const FRESH_EVIDENCE_DAYS = 21;
const CALIBRATION_WINDOW_DAYS = 240;
const Z80 = 1.28; // ~80% interval

export interface CpComponent {
  cp: number;
  wPrime: number;
  hourPower: number;
  sigma: number;
  /** Weighted age (days) of the efforts that set the curve. */
  evidenceAgeDays: number;
  used: EnvelopePoint[];
  envelope: EnvelopePoint[];
}

export interface HrComponent {
  hourPower: number;
  sigma: number;
  refHr: number;
  snapshots: (EfficiencySnapshot & { ratio: number; hourPower: number })[];
}

export interface HourPowerEstimate {
  asOf: string;
  hourPower: number;
  sigma: number;
  low: number;
  high: number;
  cp: CpComponent | null;
  hr: HrComponent | null;
  durability: Durability;
}

interface Calibration {
  date: string;
  indoor: boolean;
  ratio: number;
}

export interface Model {
  rides: Ride[];
  refHr: number;
  efficiencies: RideEfficiency[];
  calibration: Calibration[];
}

function cpComponent(rides: Ride[], asOf: string, durability: Durability): CpComponent | null {
  const envelope = powerEnvelope(rides, asOf);
  const fit = fitCriticalPower(envelope);
  if (!fit) return null;
  const weight = fit.used.reduce((a, p) => a + p.duration, 0);
  const evidenceAgeDays = fit.used.reduce((a, p) => a + p.ageDays * p.duration, 0) / weight;
  // 2-parameter CP overstates very long efforts for riders who fade, so the
  // modelled 60-min power is scaled by the rider's own durability.
  const hourPower = cpPower(fit, 3600) * durability.factor;
  let sigma = 4 + 0.2 * evidenceAgeDays;
  if (fit.used.length < 3) sigma += 5;
  return { cp: fit.cp, wPrime: fit.wPrime, hourPower, sigma: Math.min(sigma, 30), evidenceAgeDays, used: fit.used, envelope };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function hrComponent(model: Model, efficiencies: RideEfficiency[], asOf: string): HrComponent | null {
  const snapshots: HrComponent["snapshots"] = [];
  const parts: { hp: number; sigma: number }[] = [];
  for (const indoor of [false, true]) {
    const snap = efficiencyAt(efficiencies, asOf, indoor);
    if (!snap) continue;
    const ratios = model.calibration
      .filter((c) => c.indoor === indoor)
      .filter((c) => {
        const age = daysBetween(c.date, asOf);
        return age > 0 && age <= CALIBRATION_WINDOW_DAYS;
      })
      .map((c) => c.ratio);
    if (!ratios.length) continue;
    const ratio = median(ratios);
    const relSpread = (median(ratios.map((r) => Math.abs(r - ratio))) * 1.4826) / ratio;
    const hp = ratio * snap.power;
    let sigma = hp * Math.max(0.02, relSpread) * Math.sqrt(Math.max(1, 6 / snap.rides));
    if (ratios.length < 3) sigma += 10;
    snapshots.push({ ...snap, ratio, hourPower: hp });
    parts.push({ hp, sigma });
  }
  if (!parts.length) return null;
  const w = parts.map((p) => 1 / p.sigma ** 2);
  const wsum = w.reduce((a, b) => a + b, 0);
  const hourPower = parts.reduce((a, p, i) => a + p.hp * w[i], 0) / wsum;
  return { hourPower, sigma: 1 / Math.sqrt(wsum), refHr: model.refHr, snapshots };
}

/** Estimate hour power at `asOf` from rides strictly up to and including `rides`. */
export function estimateAt(model: Model, rides: Ride[], asOf: string): HourPowerEstimate | null {
  const durability = durabilityAt(rides, asOf);
  const ids = new Set(rides.map((r) => r.id));
  const efficiencies = model.efficiencies.filter((e) => ids.has(e.rideId));
  const cp = cpComponent(rides, asOf, durability);
  const hr = hrComponent(model, efficiencies, asOf);
  const parts = [cp, hr].filter((p): p is CpComponent | HrComponent => p !== null);
  if (!parts.length) return null;
  const w = parts.map((p) => 1 / p.sigma ** 2);
  const wsum = w.reduce((a, b) => a + b, 0);
  const hourPower = parts.reduce((a, p, i) => a + p.hourPower * w[i], 0) / wsum;
  const sigma = 1 / Math.sqrt(wsum);
  return {
    asOf,
    hourPower,
    sigma,
    low: hourPower - Z80 * sigma,
    high: hourPower + Z80 * sigma,
    cp,
    hr,
    durability,
  };
}

/**
 * Build the model. Calibration ratios (power-duration hour power divided by
 * efficiency) are taken only on dates where the curve rested on fresh hard
 * efforts, so the heart-rate pathway learns from trustworthy anchors.
 */
export function buildModel(allRides: Ride[]): Model {
  const rides = [...allRides].filter((r) => r.streams).sort((a, b) => a.startLocal.localeCompare(b.startLocal));
  const refHr = referenceHeartRate(rides);
  const efficiencies = rides.map((r) => rideEfficiency(r, refHr)).filter((e): e is RideEfficiency => e !== null);
  const model: Model = { rides, refHr, efficiencies, calibration: [] };
  for (let i = 0; i < rides.length; i++) {
    const asOf = rides[i].startLocal;
    const prefix = rides.slice(0, i + 1);
    const cp = cpComponent(prefix, asOf, durabilityAt(prefix, asOf));
    if (!cp || cp.evidenceAgeDays > FRESH_EVIDENCE_DAYS) continue;
    const effs = efficiencies.filter((e) => daysBetween(e.date, asOf) >= 0);
    for (const indoor of [false, true]) {
      const snap = efficiencyAt(effs, asOf, indoor);
      if (snap) model.calibration.push({ date: asOf, indoor, ratio: cp.hourPower / snap.power });
    }
  }
  return model;
}
