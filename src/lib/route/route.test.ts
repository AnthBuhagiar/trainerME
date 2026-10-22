import { describe, expect, test } from "vitest";
import { DEFAULT_PHYSICS, predictEvent } from "@/lib/goals/eventTime";
import { parseGpx } from "@/lib/route/gpx";
import { planForTarget, predictRoute } from "@/lib/route/pacing";

/** A GPX running north: flat 10 km, a 5 km climb at 6%, a 5 km descent, flat 10 km. */
function syntheticGpx(): string {
  const pts: string[] = [];
  const metresPerDegLat = 111_195;
  let ele = 100;
  for (let d = 0; d <= 30_000; d += 50) {
    if (d > 10_000 && d <= 15_000) ele += 0.06 * 50;
    else if (d > 15_000 && d <= 20_000) ele -= 0.06 * 50;
    pts.push(`<trkpt lat="${(-33.4 + d / metresPerDegLat).toFixed(7)}" lon="149.58"><ele>${ele.toFixed(1)}</ele></trkpt>`);
  }
  return `<?xml version="1.0"?><gpx><trk><name>Test loop</name><trkseg>${pts.join("")}</trkseg></trk></gpx>`;
}

describe("GPX route", () => {
  const route = parseGpx(syntheticGpx());

  test("distance, climbing and name", () => {
    expect(route.name).toBe("Test loop");
    expect(route.distanceKm).toBeCloseTo(30, 0);
    expect(route.climbingM).toBeGreaterThan(270);
    expect(route.climbingM).toBeLessThan(330);
  });

  test("finds the one climb", () => {
    expect(route.climbs).toHaveLength(1);
    const [c] = route.climbs;
    expect(c.startKm).toBeGreaterThan(9.5);
    expect(c.startKm).toBeLessThan(10.6);
    expect(c.lengthKm).toBeGreaterThan(4.5);
    expect(c.avgGrade).toBeGreaterThan(5);
    expect(c.avgGrade).toBeLessThan(7);
  });

  test("rejects files without points", () => {
    expect(() => parseGpx("<gpx></gpx>")).toThrow(/No route points/);
  });

  test("pacing: climbs harder than flats, finish time in the same range as the simple model", () => {
    const physics = { ...DEFAULT_PHYSICS, massKg: 87 };
    const plan = predictRoute(route, 181, physics);
    expect(plan.climbs[0].watts).toBeGreaterThan(plan.basePower);
    const simple = predictEvent(route.distanceKm, route.climbingM, 181, physics);
    expect(plan.seconds / simple.seconds).toBeGreaterThan(0.8);
    expect(plan.seconds / simple.seconds).toBeLessThan(1.2);
    const target = planForTarget(route, plan.seconds * 0.9, physics);
    expect(target.avgPower).toBeGreaterThan(plan.avgPower);
  });
});
