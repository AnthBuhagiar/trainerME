import { describe, expect, test } from "vitest";
import { ergStep, type ErgInput, type ErgMemory } from "@/lib/player/erg";

/** Run the controller second by second from `from`, returning each command. */
function ride(inputs: Partial<ErgInput>[], memory: ErgMemory = {}) {
  let m = memory;
  return inputs.map((p, i) => {
    const { command, memory: next } = ergStep({ now: i * 1000, running: true, ergOn: true, target: 200, sprint: false, cadence: 90, power: 200, ...p }, m);
    m = next;
    return command;
  });
}

describe("ERG", () => {
  test("starts gently: ramps from half the target over 5 s, then holds it", () => {
    const out = ride(Array.from({ length: 7 }, () => ({ power: 0 })));
    expect(out.map((c) => c.watts)).toEqual([100, 120, 140, 160, 180, 200, 200]);
    expect(out[0].reason).toBe("ramp");
    expect(out[6]).toEqual({ mode: "erg", watts: 200, reason: "erg" });
  });

  test("no ramp when you're already riding the target", () => {
    expect(ride([{ power: 195 }])[0]).toEqual({ mode: "erg", watts: 200, reason: "erg" });
  });

  test("short sprints are ridden on the gears, and the recovery after needs no ramp", () => {
    const out = ride([{}, { sprint: true, target: 600 }, { sprint: true, target: 600, power: 550 }, { target: 120, power: 500 }]);
    expect(out[1]).toEqual({ mode: "gears", reason: "sprint" });
    expect(out[3]).toEqual({ mode: "erg", watts: 120, reason: "erg" });
  });

  test("low cadence for 3 s releases the resistance; spinning back up brings ERG back, gently", () => {
    const out = ride([
      {}, { cadence: 45 }, { cadence: 40 }, { cadence: 38 }, { cadence: 35 }, // 4 s slow
      { cadence: 70, power: 120 }, { cadence: 75, power: 130 }, { cadence: 80, power: 140 },
    ]);
    expect(out[3].mode).toBe("erg"); // 2 s slow: not yet
    expect(out[4]).toEqual({ mode: "gears", reason: "low-cadence" });
    expect(out[6].mode).toBe("gears"); // back above 65 rpm, but only for 1 s
    expect(out[7]).toMatchObject({ mode: "erg", reason: "ramp" });
    expect(out[7].watts).toBeLessThan(200);
  });

  test("a short dip in cadence changes nothing", () => {
    const out = ride([{}, { cadence: 45 }, { cadence: 85 }, { cadence: 45 }, { cadence: 85 }]);
    expect(out.every((c) => c.mode === "erg")).toBe(true);
  });

  test("ERG off rides on the gears; pausing does too, and resuming ramps back in", () => {
    expect(ride([{ ergOn: false }])[0]).toEqual({ mode: "gears", reason: "off" });
    const out = ride([{}, { running: false }, { running: true, power: 0 }]);
    expect(out[1]).toEqual({ mode: "gears", reason: "paused" });
    expect(out[2]).toMatchObject({ mode: "erg", reason: "ramp", watts: 100 });
  });
});
