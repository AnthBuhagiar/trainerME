import { describe, expect, test } from "vitest";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { applySwaps, swapOptions } from "@/lib/plan/swaps";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";

const ride = (date: string, id: string, minutes = 60, indoor = true): PlannedSession => {
  const r = scaleWorkout(getWorkout(id), minutes);
  return { date, weekday: 0, start: "19:30", minutes: r.minutes, kind: "ride", indoor, ride: r, why: "" };
};
const week = (...sessions: PlannedSession[]): WeekPlan => ({ weekStart: "2026-11-01", phase: "build", label: "Build", recovery: false, sessions });
const ids = (opts: ReturnType<typeof swapOptions>, kind: string) => opts.filter((o) => o.kind === kind).map((o) => o.workout.id);

describe("swapping a planned workout", () => {
  test("a threshold day offers other sustained work, easier riding, and harder only with room around it", () => {
    const tue = ride("2026-11-03", "threshold-2x15");
    const open = swapOptions(week(tue, ride("2026-11-07", "endurance", 120)), tue);
    expect(ids(open, "easier")).toEqual(expect.arrayContaining(["threshold-3x10", "sweetspot-3x12", "tempo-3x10", "endurance"]));
    expect(ids(open, "harder")).toEqual(expect.arrayContaining(["threshold-2x20"]));
    expect(ids(open, "similar")).toEqual(expect.arrayContaining(["supra-6x5"])); // other hard sustained work
    expect(ids(open, "similar")).not.toContain("long-ride-late-efforts"); // long rides stay long rides

    // A hard session the next day: nothing harder on offer.
    const tight = swapOptions(week(tue, ride("2026-11-04", "vo2-30-15")), tue);
    expect(ids(tight, "harder")).toEqual([]);
    expect(ids(tight, "easier").length).toBeGreaterThan(0);
  });

  test("an easy day stays easy", () => {
    const easy = ride("2026-11-05", "endurance");
    const opts = swapOptions(week(easy), easy);
    expect(opts.every((o) => o.kind !== "harder")).toBe(true);
  });

  test("a swap keeps the session's day and length, and remembers what was planned", () => {
    const tue = ride("2026-11-03", "threshold-2x15", 60);
    const swapped = applySwaps(week(tue), { "2026-11-03 19:30": "sweetspot-3x12" }).sessions[0];
    expect(swapped.ride!.workout.id).toBe("sweetspot-3x12");
    expect(swapped).toMatchObject({ date: "2026-11-03", start: "19:30", swappedFrom: "threshold-2x15" });
    expect(Math.abs(swapped.minutes - 60)).toBeLessThanOrEqual(10);
    expect(applySwaps(week(tue), { "2026-11-03 19:30": "no-such-workout" }).sessions[0]).toBe(tue);
  });
});
