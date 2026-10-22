import { describe, expect, test } from "vitest";
import { applyAway, awayWeeks, kindOn, type AwayPeriod } from "@/lib/plan/away";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";

const ride = (date: string, weekday: number, id: string, minutes: number): PlannedSession => {
  const r = scaleWorkout(getWorkout(id), minutes);
  return { date, weekday, start: weekday === 5 ? "05:00" : "19:30", minutes: r.minutes, kind: "ride", indoor: weekday !== 5, ride: r, why: "" };
};
const week: WeekPlan = {
  monday: "2026-11-02",
  phase: "base",
  label: "Base",
  recovery: false,
  sessions: [ride("2026-11-04", 2, "threshold-2x15", 60), ride("2026-11-05", 3, "sweetspot-3x12", 60), ride("2026-11-07", 5, "endurance", 180)],
};
const p = (start: string, end: string, kind: AwayPeriod["kind"] = "away"): AwayPeriod => ({ id: start, start, end, kind });

describe("away days", () => {
  test("away beats busy on the same day", () => {
    expect(kindOn([p("2026-11-04", "2026-11-06", "busy"), p("2026-11-05", "2026-11-05")], "2026-11-05")).toBe("away");
    expect(kindOn([p("2026-11-04", "2026-11-06", "busy")], "2026-11-04")).toBe("busy");
    expect(kindOn([p("2026-11-04", "2026-11-06", "busy")], "2026-11-07")).toBeNull();
  });

  test("an away day drops its session; the long ride moves to Sunday", () => {
    const out = applyAway(week, [p("2026-11-07", "2026-11-07"), p("2026-11-04", "2026-11-04")]);
    expect(out.sessions.map((s) => s.date)).toEqual(["2026-11-05", "2026-11-08"]);
    expect(out.sessions[1].adjusted).toMatch(/Moved from Saturday/);
  });

  test("busy days shorten sessions", () => {
    const out = applyAway(week, [p("2026-11-07", "2026-11-07", "busy")]);
    expect(out.sessions.find((s) => s.weekday === 5)!.minutes).toBe(90);
  });

  test("mostly-away weeks become holiday weeks", () => {
    // Away Thursday 5 Nov to Friday 13 Nov: only the week of 9 Nov has 5+ away days.
    expect(awayWeeks([p("2026-11-05", "2026-11-13")], "2026-10-26", "2027-04-18")).toEqual([["2026-11-09", "2026-11-15"]]);
  });
});
