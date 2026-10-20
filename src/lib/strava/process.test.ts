import { describe, expect, test } from "vitest";
import { bestAverage, normalisedPower, resample, summariseStreams } from "@/lib/strava/process";

describe("stream processing", () => {
  test("resample fills pauses with zeros", () => {
    expect(resample([0, 1, 4], [100, 110, 120])).toEqual([100, 110, 0, 0, 120]);
  });

  test("best average finds the strongest window", () => {
    expect(bestAverage([100, 300, 300, 100], 2)).toBe(300);
    expect(bestAverage([100], 2)).toBeNull();
  });

  test("normalised power of a steady effort equals its average", () => {
    expect(normalisedPower(new Array(120).fill(200))).toBe(200);
  });

  test("summary has curve, minutes and averages", () => {
    const n = 1200;
    const time = Array.from({ length: n }, (_, i) => i);
    const s = summariseStreams("1", {
      time,
      watts: time.map(() => 200),
      heartrate: time.map(() => 140),
      cadence: time.map(() => 90),
      temp: time.map(() => 21),
    });
    expect(s.power_curve?.["1200"]).toBe(200);
    expect(s.power_curve?.["3600"]).toBeNull();
    expect(s.minutes).toHaveLength(20);
    expect(s.minutes?.[0]).toEqual([200, 140]);
    expect(s.avg_temp).toBe(21);
    expect(s.avg_cadence).toBe(90);
  });

  test("rides without power still keep heart rate", () => {
    const s = summariseStreams("2", { time: [0, 1, 2], heartrate: [120, 121, 122] });
    expect(s.power_curve).toBeUndefined();
    expect(s.avg_hr).toBe(121);
  });
});
