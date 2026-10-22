import { describe, expect, test } from "vitest";
import { reviewMonday, weekReview } from "@/lib/plan/review";
import type { WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

const plan: WeekPlan = {
  monday: "2026-10-12",
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

  test("recaps this week on Sunday, last week otherwise", () => {
    expect(reviewMonday("2026-10-25", "2026-10-19")).toBe("2026-10-19");
    expect(reviewMonday("2026-10-22", "2026-10-19")).toBe("2026-10-12");
  });
});
