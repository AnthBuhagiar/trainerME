import { describe, expect, test } from "vitest";
import { bestAverage, normalisedPower, repairDropouts, resample, ridingSeconds, summariseStreams } from "@/lib/strava/process";

describe("stream processing", () => {
  test("resample holds a reading across short recording gaps, and treats long ones as stops", () => {
    expect(resample([0, 1, 4], [100, 110, 120])).toEqual([100, 110, 110, 110, 120]);
    expect(resample([0, 40], [100, 120])).toEqual([100, ...new Array(39).fill(0), 120]);
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

  test("a ride recorded every 7 seconds (smart recording) reads its real power", () => {
    // 3 hours at a steady 135 W, one reading every 7 s, with a 10-minute café stop in the middle.
    const time: number[] = [];
    for (let t = 0; t < 5400; t += 7) time.push(t);
    for (let t = 6000; t < 11400; t += 7) time.push(t);
    const s = summariseStreams("sparse", { time, watts: time.map(() => 135) });
    expect(s.avg_watts).toBe(135); // was about 19 W with the gaps read as zero
    expect(s.np).toBeGreaterThan(125);
    expect(s.kj).toBeGreaterThanOrEqual(1455); // 135 W for 3 h ≈ 1458 kJ
    expect(s.power_curve?.["3600"]).toBe(135);
    expect(ridingSeconds(time)).toBeLessThan(10900); // the stop isn't riding time
  });

  describe("power dropouts", () => {
    // Patterns from a real trainer ride (9 Nov 2026): 3 s of 0 W with cadence frozen at its last value.
    test("a short zero run while pedalling is filled from the readings either side", () => {
      const time = [0, 1, 2, 3, 4, 5, 6];
      const watts = [166, 165, 165, 0, 0, 0, 177];
      const cadence = [78, 77, 77, 77, 77, 77, 79];
      expect(repairDropouts(time, watts, cadence)).toEqual([166, 165, 165, 168, 171, 174, 177]);
    });

    test("zeros with cadence dropping (stopping or coasting) are real", () => {
      const time = [0, 1, 2, 3, 4];
      expect(repairDropouts(time, [155, 177, 0, 173, 211], [82, 81, 18, 37, 37])).toEqual([155, 177, 0, 173, 211]);
      expect(repairDropouts(time, [150, 0, 0, 0, 150], [85, 0, 0, 0, 85])).toEqual([150, 0, 0, 0, 150]);
    });

    test("long zero runs, runs at the ends and rides without cadence are left alone", () => {
      const time = Array.from({ length: 10 }, (_, i) => i);
      const long = [150, 0, 0, 0, 0, 0, 0, 0, 0, 150];
      expect(repairDropouts(time, long, time.map(() => 85))).toEqual(long);
      expect(repairDropouts([0, 1, 2, 3], [0, 0, 150, 150], [85, 85, 85, 85])).toEqual([0, 0, 150, 150]);
      expect(repairDropouts([0, 1, 2, 3], [150, 150, 0, 0], [85, 85, 85, 85])).toEqual([150, 150, 0, 0]);
      expect(repairDropouts([0, 1, 2], [150, 0, 150])).toEqual([150, 0, 150]);
    });

    test("dropouts no longer pull the power curve down", () => {
      // 20 min at 172 W with a 3 s dropout every 75 s, cadence held at 80.
      const time = Array.from({ length: 1200 }, (_, i) => i);
      const watts = time.map((t) => (t % 75 >= 30 && t % 75 < 33 ? 0 : 172));
      const s = summariseStreams("dropouts", { time, watts, cadence: time.map(() => 80) });
      expect(s.power_curve?.["1200"]).toBe(172);
      const raw = summariseStreams("raw", { time, watts });
      expect(raw.power_curve?.["1200"]).toBeLessThan(166); // without cadence, the zeros still count
    });
  });
});
