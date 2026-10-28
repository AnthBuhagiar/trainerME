import { describe, expect, test } from "vitest";
import { RING_MAX_WATTS, tickIndex } from "@/components/HourRing";
import { ringGoal } from "@/lib/goals/ringScale";

describe("Hour Ring scale", () => {
  test("0 W at 12 o'clock to 350 W at 11:59, the same for every rider", () => {
    expect(RING_MAX_WATTS).toBe(350);
    expect(tickIndex(0)).toBe(0);
    expect(tickIndex(175)).toBe(30); // half way: 6 o'clock
    expect(tickIndex(177)).toBe(30);
    expect(tickIndex(200)).toBe(34);
    expect(tickIndex(350)).toBe(59);
    expect(tickIndex(420)).toBe(59);
  });

  test("an example goal when there's none", () => {
    expect(ringGoal(210, 177)).toEqual({ goal: 210, example: false });
    expect(ringGoal(undefined, 177)).toEqual({ goal: 215, example: true });
  });
});
