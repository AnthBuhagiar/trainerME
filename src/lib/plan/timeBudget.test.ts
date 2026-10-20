import { describe, expect, test } from "vitest";
import type { Activity } from "@/lib/types";
import { addDays } from "@/lib/engine/dates";
import { applyStrengthTarget, describeSlot, inferTimeBudget } from "@/lib/plan/timeBudget";

const AS_OF = "2026-10-20T12:00:00"; // a Tuesday

function act(id: string, start: string, sportType: string, minutes: number, extra: Partial<Activity> = {}): Activity {
  return {
    id,
    name: id,
    sportType,
    startLocal: start,
    isTrainer: false,
    distance: 0,
    movingTime: minutes * 60,
    elapsedTime: minutes * 60,
    elevationGain: sportType === "Ride" ? 300 : 0,
    ...extra,
  };
}

/** 12 weeks of: Thu 19:30 indoor 60', Sat 05:00 outdoor 180', gym on a rotating evening. */
function history(): Activity[] {
  const out: Activity[] = [];
  for (let w = 0; w < 12; w++) {
    const monday = addDays("2026-10-19T00:00:00", -7 * w);
    out.push(act(`thu${w}`, addDays(monday, 3).slice(0, 11) + "19:30:00", "Ride", 60, { isTrainer: true, elevationGain: 0 }));
    out.push(act(`sat${w}`, addDays(monday, 5).slice(0, 11) + "05:00:00", "Ride", 180));
    out.push(act(`gym${w}`, addDays(monday, w % 3).slice(0, 11) + "19:45:00", "WeightTraining", 50));
  }
  // Only past activities count.
  return out.filter((a) => a.startLocal <= AS_OF);
}

describe("time budget", () => {
  test("finds fixed-day slots with start time, length and indoor share", () => {
    const b = inferTimeBudget(history(), AS_OF);
    const thu = b.slots.find((s) => s.weekday === 3)!;
    expect(thu).toMatchObject({ kind: "ride", start: "19:30", minutes: 60, indoorShare: 1 });
    const sat = b.slots.find((s) => s.weekday === 5)!;
    expect(sat).toMatchObject({ kind: "ride", start: "05:00", minutes: 180, indoorShare: 0 });
    expect(describeSlot(sat)).toBe("Sat 5 am · ride · 3 h");
  });

  test("habits on varying days become a flexible slot", () => {
    const b = inferTimeBudget(history(), AS_OF);
    const gym = b.slots.find((s) => s.kind === "strength")!;
    expect(gym.weekday).toBe(-1);
    expect(gym.perWeek).toBe(1);
    expect(describeSlot(gym)).toBe("1× a week · strength · evenings · 50 min · any day");
  });

  test("occasional sessions are not treated as slots", () => {
    const b = inferTimeBudget([...history(), act("rare", "2026-09-02T12:00:00", "Ride", 45)], AS_OF);
    expect(b.slots.filter((s) => s.kind === "ride")).toHaveLength(2);
  });

  test("ignores activities older than the window", () => {
    expect(inferTimeBudget([act("old", "2025-01-01T07:00:00", "Ride", 60)], AS_OF).slots).toHaveLength(0);
  });
});

describe("strength target", () => {
  test("converts the least regular indoor ride, never the outdoor long ride", () => {
    const extra: Activity[] = [];
    // An extra indoor ride on varying evenings most weeks.
    for (let w = 0; w < 12; w++) {
      const day = addDays("2026-10-19T00:00:00", -7 * w + [0, 1, 2, 4][w % 4]).slice(0, 11) + "19:30:00";
      if (day <= AS_OF) extra.push(act(`x${w}`, day, "Ride", 60, { isTrainer: true, elevationGain: 0 }));
    }
    const base = inferTimeBudget([...history(), ...extra], AS_OF);
    const planned = applyStrengthTarget(base);
    const strength = planned.slots.filter((s) => s.kind === "strength");
    expect(strength.reduce((n, s) => n + s.perWeek, 0)).toBe(2);
    const swapped = strength.find((s) => s.changedFrom === "ride")!;
    expect(swapped.weekday).toBe(-1); // the flexible ride went first
    expect(swapped.minutes).toBe(50); // usual strength length
    expect(planned.slots.find((s) => s.weekday === 5)?.kind).toBe("ride"); // Saturday kept
    expect(planned.slots.find((s) => s.weekday === 3)?.kind).toBe("ride"); // regular Thursday kept
  });

  test("leaves the week alone when the target is already met", () => {
    const base = inferTimeBudget(history(), AS_OF);
    expect(applyStrengthTarget(base, 1)).toBe(base);
  });

  test("never converts outdoor rides", () => {
    const outdoorOnly = inferTimeBudget(history().filter((a) => a.id.startsWith("sat")), AS_OF);
    expect(applyStrengthTarget(outdoorOnly).slots.every((s) => s.kind === "ride")).toBe(true);
  });
});
