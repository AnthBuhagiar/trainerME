import { describe, expect, test } from "vitest";
import { threeSecondPower, type Readings } from "@/lib/player/smoothing";

describe("power shown while riding", () => {
  test("is the average of the last 3 seconds of readings", () => {
    let r: Readings = [];
    const shown = [200, 260, 180, 300, 200].map((w, i) => {
      const out = threeSecondPower(r, i * 1000, w);
      r = out.readings;
      return out.power;
    });
    expect(shown).toEqual([200, 230, 213, 247, 227]); // each the mean of up to 3 readings
    expect(r).toHaveLength(3); // older readings are dropped
  });

  test("starts fresh after a gap", () => {
    const { power } = threeSecondPower([{ at: 0, watts: 400 }], 10_000, 150);
    expect(power).toBe(150);
  });
});
