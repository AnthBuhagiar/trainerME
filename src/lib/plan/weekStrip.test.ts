import { describe, expect, test } from "vitest";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";
import { missedSessions, weekStatus, weekStrip } from "@/lib/plan/weekStrip";
import type { Activity } from "@/lib/types";

const s = (date: string, kind: PlannedSession["kind"], extra: Partial<PlannedSession> = {}): PlannedSession => ({
  date, weekday: 0, start: "19:30", minutes: 60, kind, indoor: true, why: "", ...extra,
});
const a = (date: string, sportType: string, extra: Partial<Activity> = {}): Activity => ({
  id: date + sportType, name: sportType, sportType, startLocal: `${date}T07:00:00`, isTrainer: false, distance: 0, movingTime: 3600, elapsedTime: 3600, elevationGain: 300, ...extra,
});
const plan: WeekPlan = {
  weekStart: "2026-10-25", phase: "base", label: "", recovery: false,
  sessions: [
    s("2026-10-26", "strength"),
    s("2026-10-27", "ride", { ride: { workout: { intensity: "hard" } } as never }),
    s("2026-10-29", "ride", { ride: { workout: { intensity: "easy" } } as never }),
    s("2026-10-31", "ride", { indoor: false, ride: { workout: { intensity: "easy" } } as never }),
  ],
};

describe("week strip", () => {
  test("one column a day, Sunday to Saturday, with done, planned and missed icons", () => {
    const days = weekStrip(plan, [a("2026-10-25", "Run"), a("2026-10-26", "WeightTraining"), a("2026-10-28", "VirtualRide")], "2026-10-28", () => "x");
    expect(days.map((d) => d.date)).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
    const at = (i: number) => days[i].items.map((x) => `${x.icon}:${x.state}`);
    expect(at(0)).toEqual(["run:done"]); // unplanned run
    expect(at(1)).toEqual(["strength:done"]); // planned strength, done: shown once
    expect(at(2)).toEqual(["indoor:missed"]);
    expect(at(3)).toEqual(["indoor:done"]); // today
    expect(at(4)).toEqual(["indoor:planned"]);
    expect(at(5)).toEqual([]); // rest
    expect(at(6)).toEqual(["bike:planned"]);
    expect(days[3].today).toBe(true);
    expect(days[4].items[0].href).toBe("/session/2026-10-29?start=19:30");
  });

  test("marks key sessions and tells indoor from outdoor rides", () => {
    const days = weekStrip(plan, [a("2026-10-24", "Ride", { isTrainer: true })], "2026-10-25", () => "x");
    expect(days[2].items[0]).toMatchObject({ icon: "indoor", state: "planned", key: true });
    expect(days[6].items[0]).toMatchObject({ icon: "bike", key: false });
  });

  test("a missed session can still be opened and ridden", () => {
    const days = weekStrip(plan, [], "2026-10-28", () => "x");
    expect(days[2].items[0]).toMatchObject({ state: "missed", href: "/session/2026-10-27?start=19:30" });
    expect(missedSessions(plan, [], "2026-10-28", () => "x").map((s) => s.date)).toEqual(["2026-10-26", "2026-10-27"]);
  });

  test("a workout ridden on another day with Hour Power counts for its planned day", () => {
    const title = (x: PlannedSession) => (x.date === "2026-10-29" ? "Endurance + 6 × 15 s sprints" : "Other");
    // Thursday's session ridden on Wednesday: Strava has it under the workout's name.
    const early = a("2026-10-28", "VirtualRide", { name: "Endurance + 6 × 15 s sprints", isTrainer: true });
    const { days, covered } = weekStatus(plan, [early], "2026-10-28", title);
    expect(days[4].items).toEqual([]); // Thursday: nothing left to do
    expect(days[3].items.map((x) => x.state)).toEqual(["done"]);
    expect([...covered].map((s) => s.date)).toEqual(["2026-10-29"]);
    // Tuesday's missed session ridden today counts too.
    const late = a("2026-10-28", "VirtualRide", { name: "Other", isTrainer: true });
    expect(missedSessions(plan, [late], "2026-10-28", (x) => (x.date === "2026-10-27" ? "Other" : "y")).map((s) => s.date)).toEqual(["2026-10-26"]);
  });
});
