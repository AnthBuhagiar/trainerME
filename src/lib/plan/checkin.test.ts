import { describe, expect, test } from "vitest";
import { applyCheckIn } from "@/lib/plan/checkin";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { STRENGTH, type PlannedSession } from "@/lib/plan/week";

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
