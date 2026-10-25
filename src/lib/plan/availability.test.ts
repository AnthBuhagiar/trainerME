import { describe, expect, test } from "vitest";
import { budgetFromChoices, choicesFromBudget, parseChoices, type DayChoice } from "@/lib/plan/availability";
import { periodise } from "@/lib/plan/periodise";
import { auditWeek } from "@/lib/plan/protocol";
import type { TimeBudget, TimeSlot } from "@/lib/plan/timeBudget";
import { planWeek } from "@/lib/plan/week";

const off = (weekday: number): DayChoice => ({ weekday, kind: "off", start: "18:00", minutes: 0, indoor: true });

describe("chosen days", () => {
  test("pre-fills from the learned week, placing flexible sessions on days", () => {
    const slot = (s: Partial<TimeSlot>): TimeSlot => ({ weekday: -1, perWeek: 1, kind: "ride", start: "19:30", minutes: 60, frequency: 1, indoorShare: 1, ...s });
    const learned: TimeBudget = {
      slots: [slot({ weekday: 2 }), slot({ weekday: 5, start: "05:00", minutes: 180, indoorShare: 0 }), slot({ kind: "strength", minutes: 55 })],
      totalMinutes: 295,
      weeksAnalysed: 12,
    };
    const days = choicesFromBudget(learned);
    expect(days).toHaveLength(7);
    expect(days[2]).toMatchObject({ kind: "ride", start: "19:30", minutes: 60, indoor: true });
    expect(days[5]).toMatchObject({ kind: "ride", start: "05:00", minutes: 180, indoor: false });
    expect(days.filter((d) => d.kind === "strength")).toHaveLength(1);
  });

  test("validates what the form sends", () => {
    expect(parseChoices([])).toBe("Send all seven days.");
    const week = Array.from({ length: 7 }, (_, i) => off(i));
    week[1] = { weekday: 1, kind: "ride", start: "06:00", minutes: 5, indoor: true };
    expect(parseChoices(week)).toMatch(/15 minutes/);
    week[1].minutes = 60;
    week[1].start = "bogus";
    expect((parseChoices(week) as DayChoice[])[1]).toMatchObject({ kind: "ride", start: "18:00", minutes: 60 });
  });

  test("a different week (Tue/Thu indoors, Sunday long ride) still follows the protocol to Bathurst", () => {
    const days = Array.from({ length: 7 }, (_, i) => off(i));
    days[1] = { weekday: 1, kind: "ride", start: "06:00", minutes: 60, indoor: true };
    days[3] = { weekday: 3, kind: "ride", start: "06:00", minutes: 75, indoor: true };
    days[6] = { weekday: 6, kind: "ride", start: "07:00", minutes: 180, indoor: false };
    days[0] = { weekday: 0, kind: "strength", start: "19:00", minutes: 45, indoor: true };
    days[4] = { weekday: 4, kind: "strength", start: "19:00", minutes: 45, indoor: true };
    const budget = budgetFromChoices(days);
    expect(budget.totalMinutes).toBe(405);
    const phases = periodise("2026-10-25", "2027-04-18");
    for (const p of phases) {
      for (let w = p.start; w <= p.end; w = new Date(Date.parse(`${w}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10)) {
        const plan = planWeek(budget, { weekStart: w, phase: p });
        expect(auditWeek(plan)).toEqual([]);
        // Sunday's long ride is the first session of each Sunday-to-Saturday week.
        if (!plan.recovery && p.name !== "taper") expect(plan.sessions[0]).toMatchObject({ date: w, kind: "ride" });
      }
    }
  });
});
