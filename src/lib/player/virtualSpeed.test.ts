import { describe, expect, test } from "vitest";
import { DEFAULT_PHYSICS } from "@/lib/goals/eventTime";
import { virtualSpeed } from "@/lib/player/virtualSpeed";

const physics = { ...DEFAULT_PHYSICS, massKg: 87 };

describe("speed and distance on the trainer", () => {
  test("are what the power would do on a flat road", () => {
    const hour = virtualSpeed(Array.from({ length: 3600 }, (_, t) => ({ t, power: 200 })), physics);
    const kmh = hour[0].speed * 3.6;
    expect(kmh).toBeGreaterThan(30); // 200 W on the flat: low 30s km/h
    expect(kmh).toBeLessThan(36);
    expect(hour[3599].distance / 1000).toBeCloseTo(kmh, 0); // an hour at that speed
  });

  test("more power is faster, and no power stands still", () => {
    const [easy, hard, stopped] = virtualSpeed([{ t: 0, power: 120 }, { t: 1, power: 300 }, { t: 2, power: 0 }], physics);
    expect(hard.speed).toBeGreaterThan(easy.speed);
    expect(stopped.speed).toBe(0);
    expect(stopped.distance).toBe(hard.distance);
  });
});
