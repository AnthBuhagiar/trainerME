import { describe, expect, test } from "vitest";
import { reviewWeekStart, weekReview } from "@/lib/plan/review";
import type { WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

const plan: WeekPlan = {
  weekStart: "2026-10-12",
  phase: "base",
  label: "Base and threshold",
  recovery: false,
  sessions: [
    { date: "2026-10-12", weekday: 0, start: "19:45", minutes: 55, kind: "strength", indoor: true, why: "" },
    { date: "2026-10-14", weekday: 2, start: "19:30", minutes: 60, kind: "ride", indoor: true, why: "" },
    { date: "2026-10-15", weekday: 3, start: "19:45", minutes: 60, kind: "ride", indoor: true, why: "" },
    { date: "2026-10-17", weekday: 5, start: "05:00", minutes: 180, kind: "ride", indoor: false, why: "" },
  ],
};
const act = (id: string, start: string, sportType: string, minutes: number): Activity => ({
  id, name: id, sportType, startLocal: start, isTrainer: false, distance: 0, movingTime: minutes * 60, elapsedTime: minutes * 60, elevationGain: 0,
});

describe("weekly review", () => {
  test("counts what got done, matching by day then by kind", () => {
    const r = weekReview(plan, [act("a", "2026-10-14T19:30:00", "VirtualRide", 62), act("b", "2026-10-18T06:00:00", "Ride", 150), act("old", "2026-10-05T06:00:00", "Ride", 90)], {
      points: [
        { date: "2026-10-10T07:00:00", hourPower: 180, low: 0, high: 0 },
        { date: "2026-10-18T07:00:00", hourPower: 182.4, low: 0, high: 0 },
      ],
      ledger: [{ date: "2026-10-18T07:00:00", rideId: "b", rideName: "Sunday ride", delta: 2.4, decay: 0, reasons: [], after: 182.4 }],
      current: null,
    });
    expect(r).toMatchObject({ planned: 4, done: 2, doneMinutes: 212, rides: 2, strength: 0, change: 2.4, best: { name: "Sunday ride", delta: 2.4 } });
    expect(r.headline).toBe("2 of 4 done. Missed sessions are gone, not owed.");
  });

  test("recaps this week on Saturday (the week's last day), last week otherwise", () => {
    expect(reviewWeekStart("2026-10-24", "2026-10-18")).toBe("2026-10-18");
    expect(reviewWeekStart("2026-10-25", "2026-10-25")).toBe("2026-10-18");
    expect(reviewWeekStart("2026-10-22", "2026-10-18")).toBe("2026-10-11");
  });

  test("P18: a run on an easy-ride day counts as that ride; never for the key session or the long ride", () => {
    const easy = { name: "Endurance", intensity: "easy" } as never;
    const hard = { name: "Threshold", intensity: "hard" } as never;
    const week: WeekPlan = {
      ...plan,
      sessions: [
        { ...plan.sessions[1], ride: { workout: hard } as never },
        { ...plan.sessions[2], ride: { workout: easy } as never },
        { ...plan.sessions[3], ride: { workout: easy } as never },
      ],
    };
    const r = weekReview(week, [
      act("tue", "2026-10-14T18:00:00", "Run", 45), // key-session day: shown, not counted
      act("wed", "2026-10-15T18:00:00", "Run", 45), // easy-ride day: counted
      act("sat", "2026-10-17T07:00:00", "Run", 90), // long-ride day: not counted
      act("walk", "2026-10-16T12:00:00", "Walk", 60),
    ], null);
    expect(r.done).toBe(1);
    expect(r.doneMinutes).toBe(45);
    expect(r.other.map((o) => [o.name, o.counted])).toEqual([
      ["Run", false],
      ["Run", true],
      ["Walk", false],
      ["Run", false],
    ]);
    expect(r.other.map((o) => o.date)).toEqual(["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"]);
  });
});
