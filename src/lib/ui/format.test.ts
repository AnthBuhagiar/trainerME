import { describe, expect, test } from "vitest";
import { plain } from "@/lib/ui/format";

describe("plain", () => {
  test("drops evidence and rule codes the rider doesn't need", () => {
    expect(plain("Most riding stays easy (E1).")).toBe("Most riding stays easy.");
    expect(plain("Practice for event day (E6, E7).")).toBe("Practice for event day.");
    expect(plain("Lighter, so most of the week stays easy (P2).")).toBe("Lighter, so most of the week stays easy.");
    expect(plain("Key session of the week.")).toBe("Key session of the week.");
  });
});
