import { describe, expect, test } from "vitest";
import { backtest } from "@/lib/engine/backtest";
import { buildModel } from "@/lib/engine/hourPower";
import type { Ride } from "@/lib/types";

/** Rides on a known power curve; the last one is a hard hour at a chosen power. */
function ride(id: string, date: string, best60?: number, hours = 1): Ride {
  const curve: Record<string, number | null> = {};
  for (const d of [300, 480, 600, 1200, 1800]) curve[d] = 230 + 20_000 / d;
  curve["3600"] = best60 ?? 200;
  const minutes: [number, number][] = Array.from({ length: 60 }, (_, i) => [150 + (i % 10) * 3, 140 + (i % 5)]);
  return {
    id, name: id, sportType: "Ride", startLocal: date, isTrainer: false, indoor: false,
    distance: 30_000, movingTime: hours * 3600, elapsedTime: hours * 3600, elevationGain: 300,
    streams: { powerCurve: curve, minutes, kj: Math.round((best60 ?? 160) * hours * 3.6) },
  };
}

describe("back-test", () => {
  test("judges a hard hour against the estimate made before it", () => {
    const rides = [ride("a", "2026-09-01T08:00:00"), ride("b", "2026-09-08T08:00:00"), ride("test", "2026-09-15T08:00:00", 236)];
    const b = backtest(buildModel(rides));
    const check = b.checks.find((c) => c.rideId === "test" && c.kind === "hour")!;
    expect(check.predicted).toBeGreaterThan(220);
    expect(check.actual).toBe(236);
    expect(check.error).toBe(check.actual - check.predicted);
    expect(b.hour.n).toBeGreaterThanOrEqual(1);
  });

  test("easy rides are not tests", () => {
    const rides = [ride("a", "2026-09-01T08:00:00"), ride("easy", "2026-09-08T08:00:00", 150)];
    expect(backtest(buildModel(rides)).checks.some((c) => c.rideId === "easy" && c.kind === "hour")).toBe(false);
  });

  test("long rides are checked on moving-time average power", () => {
    const rides = [ride("a", "2026-09-01T08:00:00"), ride("long", "2026-09-08T08:00:00", 150, 5)];
    const long = backtest(buildModel(rides)).checks.find((c) => c.kind === "long")!;
    expect(long.actual).toBe(150);
    expect(long.predicted).toBeGreaterThan(150);
  });
});
