import { describe, expect, test } from "vitest";
import type { Phase } from "@/lib/plan/periodise";
import type { TimeBudget, TimeSlot } from "@/lib/plan/timeBudget";
import { fuelFor, planWeek } from "@/lib/plan/week";

const slot = (s: Partial<TimeSlot>): TimeSlot => ({ weekday: -1, perWeek: 1, kind: "ride", start: "19:30", minutes: 60, frequency: 1, indoorShare: 1, ...s });
// The shape of a real week: two weeknight indoor rides, a long Saturday, two flexible strength sessions.
const budget: TimeBudget = {
  slots: [
    slot({ weekday: 2, start: "19:30" }),
    slot({ weekday: 3, start: "19:45" }),
    slot({ weekday: 5, start: "05:00", minutes: 175, indoorShare: 0 }),
    slot({ kind: "strength", start: "19:45", minutes: 55 }),
    slot({ kind: "strength", start: "19:30", minutes: 55, changedFrom: "ride" }),
  ],
  totalMinutes: 405,
  weeksAnalysed: 12,
};
const phase = (name: Phase["name"], recoveryWeeks: string[] = []): Phase => ({
  name,
  label: name,
  start: "2026-10-26",
  end: "2027-04-18",
  weeks: 10,
  focus: "",
  recoveryWeeks,
});

describe("week plan", () => {
  test("key session first, an easier one the next night, long ride kept steady in base", () => {
    const week = planWeek(budget, { monday: "2026-10-26", phase: phase("base") });
    const [wed, thu] = week.sessions.filter((s) => s.kind === "ride");
    expect(wed).toMatchObject({ date: "2026-10-28", start: "19:30" });
    expect(wed.ride!.workout.id).toBe("threshold-2x15");
    expect(thu.ride!.workout.id).toBe("sweetspot-3x12");
    const sat = week.sessions.find((s) => s.weekday === 5)!;
    expect(sat.ride!.workout.id).toBe("endurance");
    expect(sat.minutes).toBe(175);
    expect(sat.fuel).toMatchObject({ gramsPerHour: 60 });
  });

  test("two strength sessions on free days, spread out", () => {
    const week = planWeek(budget, { monday: "2026-10-26", phase: phase("base") });
    const days = week.sessions.filter((s) => s.kind === "strength").map((s) => s.weekday);
    expect(days).toHaveLength(2);
    expect(days.every((d) => ![2, 3, 5].includes(d))).toBe(true);
    expect(Math.abs(days[0] - days[1])).toBeGreaterThanOrEqual(2);
  });

  test("build phase adds VO2 work and late efforts in the long ride", () => {
    const week = planWeek(budget, { monday: "2027-01-11", phase: phase("build") });
    expect(week.sessions.find((s) => s.weekday === 2)!.ride!.workout.id).toBe("vo2-30-15");
    expect(week.sessions.find((s) => s.weekday === 5)!.ride!.workout.id).toBe("long-ride-late-efforts");
  });

  test("recovery weeks cut volume and intensity", () => {
    const week = planWeek(budget, { monday: "2026-11-16", phase: phase("base", ["2026-11-16"]) });
    expect(week.recovery).toBe(true);
    const rides = week.sessions.filter((s) => s.ride);
    expect(rides.every((s) => s.ride!.workout.intensity !== "hard")).toBe(true);
    expect(week.sessions.find((s) => s.weekday === 5)!.minutes).toBeLessThan(175);
  });

  test("event week: shorter rides, no heavy legs, nothing on or after event day", () => {
    const week = planWeek(budget, { monday: "2027-04-12", phase: phase("taper"), daysToGoal: 6 });
    expect(week.sessions.every((s) => s.weekday < 6)).toBe(true);
    expect(week.sessions.filter((s) => s.strength).every((s) => s.strength!.name === "Mobility and core")).toBe(true);
    expect(week.sessions.find((s) => s.weekday === 5)!.minutes).toBeLessThanOrEqual(80);
  });
});

describe("fuel", () => {
  test("follows ride length (E7)", () => {
    expect(fuelFor(60, "base", "hard")).toBeUndefined();
    expect(fuelFor(120, "base", "easy")!.gramsPerHour).toBe(40);
    expect(fuelFor(240, "specific", "moderate")).toMatchObject({ gramsPerHour: 90, totalGrams: 360 });
  });
});
