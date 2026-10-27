import { describe, expect, test } from "vitest";
import { spaceStrength } from "@/lib/plan/strengthSpacing";
import { placeSlots, planWeek, type WeekPlan } from "@/lib/plan/week";
import type { TimeSlot } from "@/lib/plan/timeBudget";
import type { Activity } from "@/lib/types";

const slot = (s: Partial<TimeSlot>): TimeSlot => ({ weekday: -1, perWeek: 1, kind: "ride", start: "19:30", minutes: 60, frequency: 1, indoorShare: 1, ...s });
const lift = (date: string): Activity => ({
  id: date, name: "Weights", sportType: "WeightTraining", startLocal: `${date}T19:45:00`, isTrainer: true, distance: 0,
  movingTime: 3600, elapsedTime: 3600, elevationGain: 0,
});
// Week of Sun 25 Oct 2026. Weekdays: Mon = 0 ... Sun = 6.
const week = (slots: TimeSlot[]): WeekPlan => planWeek({ slots, totalMinutes: 0, weeksAnalysed: 12 }, { weekStart: "2026-10-25", phase: null });
const strengthDates = (w: WeekPlan) => w.sessions.filter((s) => s.kind === "strength").map((s) => s.date);

describe("P20: strength days apart", () => {
  test("the planner never puts two strength days in a row while another day is free", () => {
    const placed = placeSlots([slot({ weekday: 0, kind: "strength" }), slot({ weekday: 2 }), slot({ weekday: 3 }), slot({ weekday: 5, minutes: 180 }), slot({ kind: "strength" })]);
    const days = placed.filter((p) => p.slot.kind === "strength").map((p) => p.weekday);
    expect(Math.abs(days[0] - days[1])).toBeGreaterThan(1);
  });

  test("no strength the day after strength was logged: it moves to a free day apart from it", () => {
    const w = week([slot({ weekday: 0, kind: "strength" }), slot({ weekday: 1, kind: "strength" }), slot({ weekday: 3 }), slot({ weekday: 5, minutes: 180 })]);
    expect(strengthDates(w)).toEqual(["2026-10-26", "2026-10-27"]); // as chosen: Mon and Tue
    const out = spaceStrength(w, [lift("2026-10-26")], "2026-10-27");
    const dates = strengthDates(out);
    expect(dates).not.toContain("2026-10-27");
    expect(dates).toHaveLength(2);
    const moved = out.sessions.find((s) => s.kind === "strength" && s.date > "2026-10-27")!;
    expect(moved.date).toBe("2026-10-28"); // Wed: the first free day not next to Monday (Thu has a ride)
    expect(moved.movedFrom).toBe("2026-10-27");
    expect(moved.adjusted).toBe("Moved from today: you did strength yesterday.");
  });

  test("strength done early covers the next planned one", () => {
    const w = week([slot({ weekday: 0, kind: "strength" }), slot({ weekday: 3, kind: "strength" }), slot({ weekday: 2 }), slot({ weekday: 5, minutes: 180 })]);
    // Did both on Sun and Mon instead of Mon and Thu.
    const out = spaceStrength(w, [lift("2026-10-25"), lift("2026-10-26")], "2026-10-27");
    expect(strengthDates(out)).toEqual(["2026-10-26"]);
    expect(out.adaptation).toMatch(/already done this week/);
  });

  test("with no free day left, it's dropped rather than squeezed next to another", () => {
    const w = week([0, 1, 2, 3, 4, 5, 6].map((d) => slot({ weekday: d, kind: d === 0 || d === 1 ? "strength" : "ride", minutes: d === 5 ? 180 : 60 })));
    const out = spaceStrength(w, [lift("2026-10-26")], "2026-10-27");
    expect(strengthDates(out)).toEqual(["2026-10-26"]);
    expect(out.adaptation).toMatch(/No strength today: you did it yesterday/);
  });

  test("leaves a well-spaced week alone", () => {
    const w = week([slot({ weekday: 0, kind: "strength" }), slot({ weekday: 4, kind: "strength" }), slot({ weekday: 2 })]);
    expect(spaceStrength(w, [lift("2026-10-26")], "2026-10-27")).toBe(w);
    expect(spaceStrength(w, [], "2026-11-03")).toBe(w); // another week
  });
});
