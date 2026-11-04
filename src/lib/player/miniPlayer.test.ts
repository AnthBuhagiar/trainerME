import { describe, expect, test } from "vitest";
import { clock, fitSize, powerStatus } from "@/lib/player/miniPlayer";

describe("mini player", () => {
  test("shows how far off target, like the dashboard", () => {
    expect(powerStatus(undefined, 200).text).toBe("no power yet");
    expect(powerStatus(205, 200).text).toBe("on target");
    expect(powerStatus(180, 200).text).toBe("20 W low");
    expect(powerStatus(230, 200).text).toBe("30 W high");
  });

  test("clock", () => {
    expect(clock(65)).toBe("1:05");
    expect(clock(3725)).toBe("1:02:05");
  });
});

describe("mini player numbers", () => {
  // A font whose text is 0.6 × size wide per character.
  const measure = (text: string) => (px: number) => text.length * px * 0.6;
  test("are as big as their box allows, and never wider", () => {
    expect(fitSize(measure("205"), 260, 120)).toBe(120); // fits at full size
    const px = fitSize(measure("1:02:05"), 260, 120); // a long countdown shrinks
    expect(px).toBeLessThan(120);
    expect(measure("1:02:05")(px)).toBeLessThanOrEqual(260);
  });
});
