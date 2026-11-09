import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { LIBRARY, deviceTargetWatts, getWorkout, scaleWorkout, targetWatts, totalMinutes } from "@/lib/plan/library";

const science = fs.readFileSync(path.join(process.cwd(), "docs/training-science.md"), "utf8");

describe("workout library", () => {
  test("every workout cites evidence that exists in training-science.md", () => {
    for (const w of LIBRARY) {
      expect(w.evidence.length).toBeGreaterThan(0);
      for (const id of w.evidence) expect(science).toContain(`## ${id} ·`);
    }
  });

  test("default lengths sit inside each workout's allowed range", () => {
    for (const w of LIBRARY) {
      if (w.steady) continue; // steady rides are sized by the slot
      const m = totalMinutes(w);
      expect(m).toBeGreaterThanOrEqual(w.minMinutes);
      expect(m).toBeLessThanOrEqual(w.maxMinutes);
    }
  });

  test("2 × 15 threshold is a one-hour session at 97–102% of hour power", () => {
    const w = getWorkout("threshold-2x15");
    expect(totalMinutes(w)).toBe(60);
    expect(targetWatts(w.main!.work, 181)).toEqual([176, 185]);
  });

  test("shrinking keeps the quality work where possible", () => {
    const w = getWorkout("threshold-2x15");
    const s45 = scaleWorkout(w, 45);
    expect(s45.minutes).toBeLessThanOrEqual(45);
    expect(s45.kept).toBe(1); // warm-up and cool-down absorb the cut
    const s35 = scaleWorkout(w, 35);
    expect(s35.minutes).toBeLessThanOrEqual(35);
    expect(s35.kept).toBe(0.5); // one 15-min effort left
  });

  test("30/15s drop a whole set before cutting reps", () => {
    const s = scaleWorkout(getWorkout("vo2-30-15"), 45);
    expect(s.workout.main!.sets).toBe(2);
    expect(s.workout.main!.reps).toBe(13);
  });

  test("endurance rides stretch to fill the slot", () => {
    const s = scaleWorkout(getWorkout("endurance"), 150);
    expect(s.minutes).toBe(150);
  });

  test("never goes below a workout's minimum length", () => {
    expect(scaleWorkout(getWorkout("threshold-2x15"), 10).minutes).toBeGreaterThanOrEqual(30);
  });
});

describe("longer than planned", () => {
  test("the extra is steady easy riding after the main set; the hard work is unchanged", () => {
    const w = getWorkout("sprints-6x15s");
    const base = totalMinutes(w);
    const long = scaleWorkout(w, 60);
    expect(long.minutes).toBe(60);
    expect(long.workout.main).toEqual(w.main);
    expect(long.workout.steady).toEqual({ seconds: (60 - base) * 60, target: [0.6, 0.75] });
    expect(scaleWorkout(w, 200).minutes).toBe(90); // never past maxMinutes
    expect(scaleWorkout(getWorkout("endurance"), 90).workout.steady!.seconds).toBe((90 - 15) * 60);
  });
});

describe("device target windows", () => {
  test("narrow targets go to devices widened to ±5% around the same middle", () => {
    // Sweet spot, 88–94% of 190 W: 167–179 W in the app, 164–182 W on Garmin (ride of 9 Nov 2026).
    const sweetSpot = { seconds: 900, target: [0.88, 0.94] as [number, number] };
    expect(targetWatts(sweetSpot, 190)).toEqual([167, 179]);
    expect(deviceTargetWatts(sweetSpot, 190)).toEqual([164, 182]);
  });

  test("targets already wider than ±5% are sent unchanged", () => {
    for (const target of [[0.5, 0.65], [1.2, 1.35], [0.45, 0.55], [0.76, 0.87]] as [number, number][]) {
      expect(deviceTargetWatts({ seconds: 600, target }, 200)).toEqual(targetWatts({ seconds: 600, target }, 200));
    }
  });

  test("every library effort on a device is at least ±5% wide and keeps its middle", () => {
    for (const w of LIBRARY) {
      const efforts = [w.warmup, w.cooldown, w.steady, w.main?.work, w.main?.rest, w.main?.betweenSets].filter((e) => e && e.seconds > 0);
      for (const e of efforts) {
        const [lo, hi] = deviceTargetWatts(e!, 200);
        const [alo, ahi] = targetWatts(e!, 200);
        expect(hi - lo).toBeGreaterThanOrEqual(Math.floor(0.1 * ((alo + ahi) / 2)));
        expect(Math.abs((lo + hi) / 2 - (alo + ahi) / 2)).toBeLessThanOrEqual(1);
      }
    }
  });
});
