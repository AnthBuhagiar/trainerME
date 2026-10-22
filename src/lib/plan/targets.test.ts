import { describe, expect, test } from "vitest";
import { targetsState } from "@/lib/plan/targets";

const base = { weightKg: 77, acceptedFtp: 208, bikeWeightKg: 8.5 };

describe("training targets", () => {
  test("first run starts from the estimate", () => {
    expect(targetsState(base, 181.4)).toEqual({ training: 181, proposal: null, initial: true });
  });

  test("small moves don't ask; 3 W does", () => {
    expect(targetsState({ ...base, trainingHourPower: 181 }, 183)?.proposal).toBeNull();
    expect(targetsState({ ...base, trainingHourPower: 181 }, 184.2)?.proposal).toBe(184);
    expect(targetsState({ ...base, trainingHourPower: 181 }, 177.6)?.proposal).toBe(178);
  });

  test("after keep, asks again only once it moves further", () => {
    const s = { ...base, trainingHourPower: 181, declinedHourPower: 184 };
    expect(targetsState(s, 185)?.proposal).toBeNull();
    expect(targetsState(s, 187)?.proposal).toBe(187);
  });

  test("no estimate, no targets", () => {
    expect(targetsState(base, null)).toBeNull();
  });
});
