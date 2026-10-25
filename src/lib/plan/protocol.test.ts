import { describe, expect, test } from "vitest";
import { christmasWindow, periodise } from "@/lib/plan/periodise";
import { auditWeek, intensitySplit, MENU, rotate } from "@/lib/plan/protocol";
import type { TimeBudget, TimeSlot } from "@/lib/plan/timeBudget";
import { EXTENDED_LONG_RIDE_MINUTES, extendedLongRideWeeks, planWeek, type WeekPlan } from "@/lib/plan/week";

const slot = (s: Partial<TimeSlot>): TimeSlot => ({ weekday: -1, perWeek: 1, kind: "ride", start: "19:30", minutes: 60, frequency: 1, indoorShare: 1, ...s });
// Anthony's usual week: Wed and Thu evenings indoors, Saturday 3 h, two strength sessions.
const budget: TimeBudget = {
  slots: [
    slot({ weekday: 2 }),
    slot({ weekday: 3, start: "19:45" }),
    slot({ weekday: 5, start: "05:00", minutes: 180, indoorShare: 0 }),
    slot({ kind: "strength", start: "19:45", minutes: 55 }),
    slot({ kind: "strength", minutes: 55 }),
  ],
  totalMinutes: 405,
  weeksAnalysed: 12,
};

/** Every week from now to Bathurst, built exactly as the app builds them. */
function bathurstBlock(): WeekPlan[] {
  const phases = periodise("2026-10-25", "2027-04-18", { holidays: [christmasWindow(2026)] });
  const extended = extendedLongRideWeeks(phases);
  const weeks: WeekPlan[] = [];
  for (const p of phases) {
    for (let m = p.start; m <= p.end; m = new Date(Date.parse(`${m}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10)) {
      const days = Math.round((Date.parse("2027-04-18T00:00:00Z") - Date.parse(`${m}T00:00:00Z`)) / 86_400_000);
      weeks.push(planWeek(budget, { weekStart: m, phase: p, daysToGoal: days <= 7 ? days : undefined, extendedLongRide: extended.has(m) ? EXTENDED_LONG_RIDE_MINUTES : undefined }));
    }
  }
  return weeks;
}

describe("training protocol", () => {
  const weeks = bathurstBlock();

  test("every week to Bathurst follows the protocol (P1, P2, P7, P8)", () => {
    const problems = weeks.flatMap((w) => auditWeek(w).map((v) => `${w.weekStart} ${w.label}: ${v.rule} ${v.message}`));
    expect(problems).toEqual([]);
  });

  test("mostly easy riding: at least 70% of riding time below tempo in every loading week", () => {
    for (const w of weeks.filter((x) => !x.recovery && x.phase !== "flex")) {
      const s = intensitySplit(w);
      expect(s.easy / s.total).toBeGreaterThanOrEqual(0.7);
    }
  });

  test("pyramidal base, then polarised build (P3)", () => {
    const keyOf = (w: WeekPlan) => w.sessions.find((s) => s.weekday === 2)?.ride?.workout.purpose;
    expect(weeks.filter((w) => w.phase === "base" && !w.recovery).every((w) => keyOf(w) === "threshold")).toBe(true);
    expect(weeks.filter((w) => w.phase === "build" && !w.recovery).every((w) => keyOf(w) === "vo2")).toBe(true);
  });

  test("interval types rotate so no key session repeats more than three loading weeks running (P5)", () => {
    let run = 0;
    let last = "";
    for (const w of weeks.filter((x) => !x.recovery && (x.phase === "base" || x.phase === "build"))) {
      const id = w.sessions.find((s) => s.weekday === 2)?.ride?.workout.id ?? "";
      run = id === last ? run + 1 : 1;
      last = id;
      expect(run).toBeLessThanOrEqual(3);
    }
    expect(rotate(MENU.build.key, 0)).toBe("vo2-30-15");
    expect(rotate(MENU.build.key, 3)).toBe("vo2-5x4");
  });

  test("the same inputs always give the same plan: rules, not guesswork", () => {
    expect(JSON.stringify(bathurstBlock())).toBe(JSON.stringify(weeks));
  });
});

describe("mostly easy by construction (P2)", () => {
  test("two separate weeknight sessions plus a long ride with efforts are eased until the week complies", async () => {
    const { budgetFromChoices } = await import("@/lib/plan/availability");
    const off = (weekday: number) => ({ weekday, kind: "off" as const, start: "18:00", minutes: 0, indoor: true });
    const days = Array.from({ length: 7 }, (_, i) => off(i)) as Parameters<typeof budgetFromChoices>[0];
    days[1] = { weekday: 1, kind: "ride", start: "06:00", minutes: 75, indoor: true };
    days[3] = { weekday: 3, kind: "ride", start: "06:00", minutes: 75, indoor: true };
    days[6] = { weekday: 6, kind: "ride", start: "07:00", minutes: 180, indoor: false };
    const phases = periodise("2026-10-25", "2027-04-18");
    const build = phases.find((p) => p.name === "build")!;
    const week = planWeek(budgetFromChoices(days), { weekStart: "2027-02-14", phase: build, step: 4 });
    expect(auditWeek(week)).toEqual([]);
    expect(week.sessions.some((s) => s.why.includes("(P2)"))).toBe(true);
  });
});
