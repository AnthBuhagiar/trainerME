import { describe, expect, test } from "vitest";
import { adapt, afterHardRide } from "@/lib/plan/adapt";
import { periodise } from "@/lib/plan/periodise";
import { auditWeek } from "@/lib/plan/protocol";
import type { TimeBudget, TimeSlot } from "@/lib/plan/timeBudget";
import { planWeek, type WeekPlan } from "@/lib/plan/week";
import type { Activity, Ride } from "@/lib/types";

const slot = (s: Partial<TimeSlot>): TimeSlot => ({ weekday: -1, perWeek: 1, kind: "ride", start: "19:30", minutes: 60, frequency: 1, indoorShare: 1, ...s });
const budget: TimeBudget = {
  slots: [slot({ weekday: 2 }), slot({ weekday: 3, start: "19:45" }), slot({ weekday: 5, start: "05:00", minutes: 180, indoorShare: 0 })],
  totalMinutes: 300,
  weeksAnalysed: 12,
};
// A block that started on 5 Oct, so a few weeks have passed by "today" (Wed 4 Nov).
const phases = periodise("2026-10-05", "2027-04-18");
const base = phases[0];
const TODAY = "2026-11-04";
const THIS_MONDAY = "2026-11-01"; // the week (Sunday to Saturday) holding TODAY
const planned = (weekStart: string): WeekPlan => planWeek(budget, { weekStart, phase: phases.find((p) => p.start <= weekStart && weekStart <= p.end) ?? null });

const ride = (date: string, minutes = 60, extra: Partial<Activity> = {}): Activity => ({
  id: date + minutes, name: "Ride", sportType: "Ride", startLocal: `${date}T19:30:00`, isTrainer: true, distance: 0,
  movingTime: minutes * 60, elapsedTime: minutes * 60, elevationGain: 0, ...extra,
});
/** Do every planned session from the block start up to (not including) a date. */
function didEverything(until: string): Activity[] {
  const out: Activity[] = [];
  for (let m = base.start; m < until; m = new Date(Date.parse(`${m}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10)) {
    for (const s of planned(m).sessions) if (s.date < until) out.push(ride(s.date, s.minutes));
  }
  return out;
}
const run = (activities: Activity[], history = null) => adapt({ today: TODAY, thisWeekStart: THIS_MONDAY, phases, activities, history, planned });

describe("adaptation (P13–P19)", () => {
  test("a fully trained block progresses on schedule, with no adjustment", () => {
    const a = run(didEverything(TODAY));
    expect(a.note).toBeUndefined();
    expect(a.context(THIS_MONDAY).step).toBe(3); // weeks of 11, 18, 25 Oct done; 1 Nov is the recovery week
    expect(a.context(THIS_MONDAY).mode).toBeUndefined();
  });

  test("P14: weeks not done don't move the plan up", () => {
    const acts = didEverything(TODAY).filter((x) => !x.startLocal.startsWith("2026-10-1")); // skipped 12–19 Oct
    expect(run(acts).context(THIS_MONDAY).step).toBeLessThan(3);
  });

  test("P13: 7–13 days off eases back in; 14+ days is a comeback week", () => {
    const tenDaysOff = didEverything("2026-10-25");
    const easing = run(tenDaysOff);
    expect(easing.context(THIS_MONDAY).mode).toBe("reentry");
    const plan = planWeek(budget, { weekStart: THIS_MONDAY, phase: base, ...easing.context(THIS_MONDAY) });
    expect(plan.label).toBe("Easing back in");
    expect(plan.sessions.filter((s) => s.ride?.workout.intensity === "hard")).toHaveLength(1);

    const comeback = run(didEverything("2026-10-15"));
    expect(comeback.context(THIS_MONDAY).mode).toBe("comeback");
    // The week after a comeback starts where the earned steps left off, not a step higher.
    const earned = comeback.context(THIS_MONDAY).step!;
    expect(comeback.context("2026-11-08").step).toBe(earned);
    const easy = planWeek(budget, { weekStart: THIS_MONDAY, phase: base, ...comeback.context(THIS_MONDAY) });
    expect(easy.sessions.every((s) => s.ride?.workout.intensity !== "hard")).toBe(true);
    expect(auditWeek(easy)).toEqual([]);
  });

  test("P16: sliding hour power despite doing the work adds a recovery week", () => {
    const history = {
      points: [
        { date: "2026-10-10T07:00:00", hourPower: 190, low: 0, high: 0 },
        { date: "2026-11-03T07:00:00", hourPower: 182, low: 0, high: 0 },
      ],
      ledger: [],
      current: null,
    };
    const a = adapt({ today: TODAY, thisWeekStart: THIS_MONDAY, phases, activities: didEverything(TODAY), history: history as never, planned });
    expect(a.context(THIS_MONDAY).mode).toBe("deload");
    const plan = planWeek(budget, { weekStart: THIS_MONDAY, phase: base, ...a.context(THIS_MONDAY) });
    expect(plan).toMatchObject({ recovery: true, label: "Extra recovery week" });
  });

  test("P17: a hard ride yesterday makes today's hard session easy", () => {
    const week = planned("2026-11-08");
    const hardYesterday: Ride = { ...ride("2026-11-10", 90), indoor: true, streams: { np: 175, powerCurve: { "1200": 180 } } };
    const out = afterHardRide(week, [hardYesterday], 181, "2026-11-11");
    const wed = out.sessions.find((s) => s.date === "2026-11-11")!;
    expect(wed.ride!.workout.intensity).not.toBe("hard");
    expect(wed.adjusted).toMatch(/rode hard yesterday/);
    expect(afterHardRide(week, [], 181, "2026-11-11")).toBe(week);
  });

  test("P18: no rides for 14+ days but still running eases back in instead of a comeback", () => {
    const acts = [...didEverything("2026-10-15"), ride("2026-10-28", 50, { sportType: "Run", isTrainer: false }), ride("2026-11-02", 40, { sportType: "Run", isTrainer: false })];
    const a = run(acts);
    expect(a.context(THIS_MONDAY).mode).toBe("reentry");
    expect(a.note).toMatch(/kept training/);
    // A walk isn't training: still a comeback.
    expect(run([...didEverything("2026-10-15"), ride("2026-11-02", 60, { sportType: "Walk" })]).context(THIS_MONDAY).mode).toBe("comeback");
  });

  test("P19: a hard run yesterday makes today's hard session easy; an easy one doesn't", () => {
    const week = planned("2026-11-08");
    const longRun = ride("2026-11-10", 80, { sportType: "Run" });
    const out = afterHardRide(week, [], 181, "2026-11-11", [longRun]);
    const wed = out.sessions.find((s) => s.date === "2026-11-11")!;
    expect(wed.ride!.workout.intensity).not.toBe("hard");
    expect(wed.adjusted).toMatch(/run was hard/);
    expect(afterHardRide(week, [], 181, "2026-11-11", [ride("2026-11-10", 80, { sportType: "Run", relativeEffort: 60 })])).toBe(week);
    expect(afterHardRide(week, [], 181, "2026-11-11", [ride("2026-11-10", 40, { sportType: "Run" })])).toBe(week);
  });
});
