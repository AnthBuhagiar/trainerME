import { describe, expect, test } from "vitest";
import type { Ride } from "@/lib/types";
import { cpPower, decayFactor, fitCriticalPower, powerEnvelope } from "@/lib/engine/powerCurve";
import { rideEfficiency, steadyBlocks } from "@/lib/engine/hrEfficiency";
import { durabilityAt } from "@/lib/engine/durability";
import { buildModel, estimateAt } from "@/lib/engine/hourPower";
import { addDays } from "@/lib/engine/dates";

const CP = 250;
const W_PRIME = 20_000;

/** Synthetic rider whose best efforts lie exactly on a known CP curve. */
function ride(id: string, date: string, opts: Partial<Ride> & { curveScale?: number; hrOffset?: number } = {}): Ride {
  const scale = opts.curveScale ?? 1;
  const curve: Record<string, number> = {};
  for (const d of [300, 480, 600, 1200, 1800]) curve[d] = (CP + W_PRIME / d) * scale;
  const minutes: [number, number][] = [];
  for (let i = 0; i < 60; i++) {
    const p = 150 + (i % 10) * 3;
    minutes.push([p, Math.round(100 + p * 0.25 + (opts.hrOffset ?? 0))]);
  }
  return {
    id,
    name: id,
    sportType: "Ride",
    startLocal: date,
    isTrainer: false,
    indoor: false,
    distance: 30_000,
    movingTime: 3600,
    elapsedTime: 3600,
    elevationGain: 300,
    streams: { powerCurve: curve, minutes },
    ...opts,
  };
}

describe("power-duration", () => {
  test("decay is flat for three weeks then declines", () => {
    expect(decayFactor(10)).toBe(1);
    expect(decayFactor(28)).toBeCloseTo(0.995, 3);
    expect(decayFactor(1000)).toBe(0.85);
  });

  test("recovers CP and W' from efforts on the curve", () => {
    const env = powerEnvelope([ride("a", "2026-10-01T08:00:00")], "2026-10-02T08:00:00");
    const fit = fitCriticalPower(env)!;
    expect(fit.cp).toBeCloseTo(CP, 0);
    expect(fit.wPrime).toBeCloseTo(W_PRIME, -2);
    expect(cpPower(fit, 3600)).toBeCloseTo(CP + W_PRIME / 3600, 0);
  });

  test("drops submaximal long efforts instead of dragging CP down", () => {
    const r = ride("a", "2026-10-01T08:00:00");
    r.streams!.powerCurve!["1800"] = 180; // an easy 30 min, not a max effort
    const fit = fitCriticalPower(powerEnvelope([r], "2026-10-02T08:00:00"))!;
    expect(fit.used.map((p) => p.duration)).not.toContain(1800);
    expect(fit.cp).toBeGreaterThan(240);
  });

  test("ignores rides outside the 90-day window", () => {
    expect(powerEnvelope([ride("a", "2026-01-01T08:00:00")], "2026-10-01T08:00:00")).toHaveLength(0);
  });
});

describe("heart-rate efficiency", () => {
  test("steady minutes exclude big power jumps", () => {
    expect(steadyBlocks([[200, 140], [400, 150], [410, 155]])).toEqual([[410, 155]]);
  });

  test("lower heart rate at the same power means more watts at reference HR", () => {
    const base = rideEfficiency(ride("a", "2026-10-01T08:00:00"), 140)!;
    const fitter = rideEfficiency(ride("b", "2026-10-02T08:00:00", { hrOffset: -5 }), 140)!;
    expect(fitter.powerAtRefHr).toBeGreaterThan(base.powerAtRefHr);
  });
});

describe("durability", () => {
  test("defaults when there are no long rides", () => {
    expect(durabilityAt([ride("a", "2026-10-01T08:00:00")], "2026-10-02T08:00:00").factor).toBe(0.97);
  });
});

describe("hour power", () => {
  test("blends both pathways and reports a range around the estimate", () => {
    const rides: Ride[] = [];
    for (let i = 0; i < 30; i++) rides.push(ride(`r${i}`, addDays("2026-08-01T08:00:00", i * 3)));
    const model = buildModel(rides);
    const asOf = addDays(rides.at(-1)!.startLocal, 1);
    const est = estimateAt(model, model.rides, asOf)!;
    expect(est.cp).not.toBeNull();
    expect(est.hr).not.toBeNull();
    expect(est.low).toBeLessThan(est.hourPower);
    expect(est.high).toBeGreaterThan(est.hourPower);
    expect(est.hourPower).toBeGreaterThan(230);
    expect(est.hourPower).toBeLessThan(262);
  });
});
