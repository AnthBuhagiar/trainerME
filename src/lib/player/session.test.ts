import { describe, expect, test } from "vitest";
import { elapsedAt, emptyRide, end, isRunning, pause, record, skip, start } from "@/lib/player/session";

describe("ride clock", () => {
  test("runs on the wall clock, so time away from the app still counts", () => {
    const s = start(emptyRide(), 1_000_000);
    expect(elapsedAt(s, 1_000_000 + 10 * 60_000)).toBe(600); // ten minutes in another app
  });

  test("pauses, resumes and skips", () => {
    let s = start(emptyRide(), 0);
    s = pause(s, 60_000);
    expect(elapsedAt(s, 300_000)).toBe(60); // paused time doesn't count
    s = start(s, 300_000);
    expect(isRunning(s)).toBe(true);
    expect(elapsedAt(s, 330_000)).toBe(90);
    s = skip(s, 120);
    expect(elapsedAt(s, 330_000)).toBe(210);
    s = end(s, 340_000);
    expect(isRunning(s)).toBe(false);
    expect(elapsedAt(s, 999_000)).toBe(220);
  });

  test("records one sample per second and leaves gaps where the app was frozen", () => {
    let s = start(emptyRide(), 0);
    s = record(s, 0, { power: 150 });
    s = record(s, 0, { power: 999 });
    s = record(s, 1, { power: 160 });
    s = record(s, 300, { power: 200 });
    expect(s.samples.map((x) => x.t)).toEqual([0, 1, 300]);
    expect(s.samples[0].power).toBe(150);
  });
});
