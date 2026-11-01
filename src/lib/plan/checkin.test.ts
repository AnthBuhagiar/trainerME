import { describe, expect, test } from "vitest";
import { applyCheckIn, applyCheckIns, takeDayOff } from "@/lib/plan/checkin";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { STRENGTH, type PlannedSession, type WeekPlan } from "@/lib/plan/week";

const ride = (id: string, minutes: number): PlannedSession => {
  const r = scaleWorkout(getWorkout(id), minutes);
  return { date: "2026-10-21", weekday: 2, start: "19:30", minutes: r.minutes, kind: "ride", indoor: true, ride: r, why: "Key session of the week." };
};

describe("check-in", () => {
  test("good changes nothing", () => {
    const s = ride("threshold-2x15", 60);
    expect(applyCheckIn(s, "good", "base")).toBe(s);
  });

  test("tired turns quality into shorter easy riding", () => {
    const s = applyCheckIn(ride("threshold-2x15", 60), "tired", "base");
    expect(s.ride!.workout.id).toBe("endurance");
    expect(s.minutes).toBe(40);
    expect(s.adjusted).toMatch(/easy/);
  });

  test("short on time keeps the purpose and cuts the length", () => {
    const s = applyCheckIn(ride("threshold-2x15", 60), "short", "base");
    expect(s.ride!.workout.purpose).toBe("threshold");
    expect(s.minutes).toBeLessThanOrEqual(45);
  });

  test("a short long ride becomes 90 min steady", () => {
    const s = applyCheckIn(ride("long-ride-late-efforts", 180), "short", "build");
    expect(s.ride!.workout.id).toBe("endurance");
    expect(s.minutes).toBe(90);
    expect(s.fuel?.gramsPerHour).toBe(40);
  });

  test("heavy strength goes light", () => {
    const gym: PlannedSession = { date: "2026-10-23", weekday: 4, start: "19:45", minutes: 55, kind: "strength", indoor: true, strength: STRENGTH.heavy, why: "" };
    const s = applyCheckIn(gym, "tired", "base");
    expect(s.strength).toBe(STRENGTH.maintenance);
    expect(s.minutes).toBe(30);
  });
});

describe("day off", () => {
  // Week of Sun 25 Oct 2026; rides Tue, Wed, Thu, Sat; Mon and Fri free.
  const on = (date: string, id: string): PlannedSession => ({ ...ride(id, 60), date, start: `${date}T19:30` });
  const week: WeekPlan = {
    weekStart: "2026-10-25",
    phase: "base",
    label: "Base",
    recovery: false,
    sessions: [on("2026-10-27", "threshold-2x15"), on("2026-10-28", "endurance"), on("2026-10-29", "threshold-2x15"), on("2026-10-31", "endurance")],
  };

  test("moves the day and everything after it along by one, up to the next free day", () => {
    const w = takeDayOff(week, "2026-10-27");
    expect(w.sessions.map((s) => s.date)).toEqual(["2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
    expect(w.sessions[0].movedFrom).toBe("2026-10-27");
    expect(w.sessions[3].movedFrom).toBeUndefined();
    expect(w.adaptation).toBeUndefined();
  });

  test("skips days the rider is away", () => {
    const w = takeDayOff(week, "2026-10-29", (d) => d === "2026-10-30");
    expect(w.sessions.some((s) => s.date === "2026-10-29")).toBe(false);
    expect(w.adaptation).toMatch(/off the plan/);
  });

  test("with no free day left, the day's session comes off the plan", () => {
    const w = takeDayOff(week, "2026-10-31");
    expect(w.sessions.map((s) => s.date)).toEqual(["2026-10-27", "2026-10-28", "2026-10-29"]);
    expect(w.adaptation).toMatch(/Saturday/);
  });

  test("a day off with nothing planned changes nothing", () => {
    expect(takeDayOff(week, "2026-10-26")).toBe(week);
  });

  test("other check-ins apply to what now sits on their day", () => {
    const w = applyCheckIns(week, { "2026-10-27": "off", "2026-10-28": "tired" });
    const wed = w.sessions.find((s) => s.date === "2026-10-28")!;
    expect(wed.movedFrom).toBe("2026-10-27");
    expect(wed.ride!.workout.id).toBe("endurance");
  });
});
