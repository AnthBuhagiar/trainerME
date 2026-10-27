import { describe, expect, test } from "vitest";
import { tickIndex } from "@/components/HourRing";
import { ringScale } from "@/lib/goals/ringScale";

describe("Hour Ring scale", () => {
  test("the goal sits at 50 minutes, with room past it", () => {
    expect(tickIndex(200, 150, 200)).toBe(50);
    expect(tickIndex(175, 150, 200)).toBe(25);
    expect(tickIndex(140, 150, 200)).toBe(0);
    expect(tickIndex(300, 150, 200)).toBe(59);
  });

  test("starts below where you are, so you never show as empty", () => {
    const s = ringScale({ startHourPower: 190 } as never, 210, null, 177);
    expect(s.start).toBeLessThan(177);
    expect(s.goal).toBe(210);
    expect(ringScale(null, undefined, null, 177)).toMatchObject({ goal: 215, example: true });
  });
});
