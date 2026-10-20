import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { LIBRARY, getWorkout, scaleWorkout, targetWatts, totalMinutes } from "@/lib/plan/library";

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
