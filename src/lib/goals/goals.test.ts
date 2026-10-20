import { describe, expect, test } from "vitest";
import { christmasWindow, mondayOf, periodise, phaseOn } from "@/lib/plan/periodise";
import { DEFAULT_PHYSICS, eventMovingSeconds, powerForTarget, predictEvent } from "@/lib/goals/eventTime";
import type { Goal } from "@/lib/goals/model";
import { goalSummary } from "@/lib/goals/summary";

describe("periodisation", () => {
  const phases = periodise("2026-10-20", "2027-04-18", { holidays: [christmasWindow(2026)] });

  test("ends with a two-week taper finishing on event week", () => {
    const taper = phases.at(-1)!;
    expect(taper.name).toBe("taper");
    expect(taper.weeks).toBe(2);
    expect(taper.start).toBe("2027-04-05");
    expect(taper.end).toBe("2027-04-18");
  });

  test("six event-specific weeks before the taper", () => {
    const specific = phases.at(-2)!;
    expect(specific).toMatchObject({ name: "specific", weeks: 6, start: "2027-02-22" });
  });

  test("starts next Monday and turns Christmas into a flex block", () => {
    expect(phases[0]).toMatchObject({ name: "base", start: "2026-10-26" });
    const flex = phases.find((p) => p.name === "flex")!;
    expect(flex.start).toBe("2026-12-21");
    expect(flex.weeks).toBe(2);
  });

  test("has a recovery week roughly every fourth loading week", () => {
    const recoveries = phases.flatMap((p) => p.recoveryWeeks);
    expect(recoveries.length).toBeGreaterThanOrEqual(4);
    expect(recoveries.every((m) => mondayOf(m) === m)).toBe(true);
  });

  test("finds the phase for a date", () => {
    expect(phaseOn(phases, "2027-03-10")?.name).toBe("specific");
    expect(phaseOn(phases, "2026-12-25")?.name).toBe("flex");
  });
});

describe("event time", () => {
  const physics = { ...DEFAULT_PHYSICS, massKg: 87 };

  test("more power means a faster finish", () => {
    expect(eventMovingSeconds(147, 2200, 150, physics)).toBeLessThan(eventMovingSeconds(147, 2200, 130, physics));
  });

  test("a 147 km / 2200 m fondo takes roughly 5.5-7.5 h for a ~177 W rider", () => {
    const p = predictEvent(147, 2200, 177, physics);
    expect(p.seconds / 3600).toBeGreaterThan(5.5);
    expect(p.seconds / 3600).toBeLessThan(7.5);
    expect(p.power).toBeLessThan(177);
  });

  test("power for a target time round-trips", () => {
    const w = powerForTarget(147, 2200, 6 * 3600, physics);
    expect(eventMovingSeconds(147, 2200, w, physics) / 3600).toBeCloseTo(6, 1);
  });
});

describe("goal summary", () => {
  const settings = { weightKg: 77, acceptedFtp: 208, bikeWeightKg: 8.5 };
  const bathurst: Goal = {
    id: "bathurst",
    name: "Bathurst Cycling Festival",
    type: "event",
    priority: "A",
    date: "2027-04-18",
    event: { distanceKm: 147, climbingM: 2200, targetMinutes: 360 },
    startHourPower: 177,
    createdAt: "2026-10-20",
  };

  test("counts down and finds the phase", () => {
    const s = goalSummary(bathurst, 177, settings, "2026-10-20");
    expect(s.daysToGo).toBe(180);
    expect(s.weeksToGo).toBe(26);
    expect(s.phase).toBeNull(); // the block starts next Monday
    expect(goalSummary(bathurst, 177, settings, "2027-03-01").phase?.name).toBe("specific");
  });

  test("a 6-hour target needs more hour power than today", () => {
    const s = goalSummary(bathurst, 177, settings, "2026-10-20");
    expect(s.predicted!.seconds).toBeGreaterThan(6 * 3600);
    expect(s.needed!.hourPower).toBeGreaterThan(177);
    expect(s.targetHourPower).toBe(s.needed!.hourPower);
  });

  test("without a target time the ring aims 10% above the start", () => {
    const s = goalSummary({ ...bathurst, event: { distanceKm: 147, climbingM: 2200 } }, 177, settings, "2026-10-20");
    expect(s.needed).toBeUndefined();
    expect(s.targetHourPower).toBe(195);
  });
});
