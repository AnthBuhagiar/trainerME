import { describe, expect, test } from "vitest";
import { clock, powerStatus } from "@/lib/player/miniPlayer";

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
