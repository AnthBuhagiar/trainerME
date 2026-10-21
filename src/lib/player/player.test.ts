import { describe, expect, test } from "vitest";
import { getWorkout } from "@/lib/plan/library";
import { parseHeartRate, parseIndoorBikeData, setTargetPower } from "@/lib/player/ftms";
import { playerSteps, stepAt } from "@/lib/player/steps";

const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

describe("FTMS", () => {
  test("target power is little-endian watts after opcode 0x05", () => {
    expect([...setTargetPower(180)]).toEqual([0x05, 180, 0]);
    expect([...setTargetPower(300)]).toEqual([0x05, 0x2c, 0x01]);
  });

  test("parses speed, cadence and power from indoor bike data", () => {
    // flags: cadence (0x04) + power (0x40); speed present (More Data clear)
    const data = parseIndoorBikeData(view([0x44, 0x00, 0xc4, 0x09, 0xb4, 0x00, 0xb5, 0x00]));
    expect(data).toEqual({ speedKmh: 25, cadence: 90, power: 181 });
  });

  test("skips fields it doesn't use", () => {
    // flags: avg speed (0x02) + cadence (0x04) + distance (0x10) + power (0x40) + HR (0x200)
    const bytes = [0x56, 0x02, 0xe8, 0x03, 0xd0, 0x07, 0xb4, 0x00, 0x10, 0x27, 0x00, 0xc8, 0x00, 0x8c];
    expect(parseIndoorBikeData(view(bytes))).toEqual({ speedKmh: 10, cadence: 90, power: 200, heartRate: 140 });
  });

  test("heart rate in 8 or 16 bits", () => {
    expect(parseHeartRate(view([0x00, 142]))).toBe(142);
    expect(parseHeartRate(view([0x01, 0x90, 0x00]))).toBe(144);
  });
});

describe("player steps", () => {
  test("expands reps and recoveries with ERG targets", () => {
    const steps = playerSteps(getWorkout("threshold-2x15"), 181);
    expect(steps.map((s) => s.label)).toEqual(["Warm up", "Rep 1 of 2", "Recover", "Rep 2 of 2", "Cool down"]);
    expect(steps[1]).toMatchObject({ seconds: 900, watts: 180, range: [176, 185], work: true });
    expect(steps.reduce((n, s) => n + s.seconds, 0)).toBe(60 * 60);
  });

  test("finds the running step", () => {
    const steps = playerSteps(getWorkout("threshold-2x15"), 181);
    expect(stepAt(steps, 0)).toEqual({ index: 0, remaining: 17 * 60 });
    expect(stepAt(steps, 17 * 60 + 30)).toEqual({ index: 1, remaining: 870 });
    expect(stepAt(steps, 3600)).toBeNull();
  });
});
