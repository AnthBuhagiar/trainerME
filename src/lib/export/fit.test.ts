import { describe, expect, test } from "vitest";
import { buildFit, fitCrc } from "@/lib/export/fit";

describe("FIT activity file", () => {
  const start = Date.parse("2026-11-04T08:30:00Z");
  const points = Array.from({ length: 600 }, (_, t) => ({ t, power: 200, hr: t % 10 ? 140 : undefined, cadence: 90 }));
  const file = buildFit(start, points, "indoor-cycling", 11 * 3600);

  test("has a valid header and checksum", () => {
    expect(file[0]).toBe(14);
    expect(String.fromCharCode(...file.subarray(8, 12))).toBe(".FIT");
    const size = new DataView(file.buffer).getUint32(4, true);
    expect(file.length).toBe(14 + size + 2);
    expect(fitCrc(file.subarray(0, 14))).toBe(0); // header CRC checks out
    expect(fitCrc(file)).toBe(0); // and so does the whole file
  });

  test("holds one record a second, with only the fields the ride has", () => {
    // Record definition: global message 20 with timestamp, heart rate, cadence and power (no GPS, speed or altitude).
    const def = file.findIndex((b, i) => (b & 0x40) === 0x40 && file[i + 3] === 20 && file[i + 4] === 0);
    expect(file[def + 5]).toBe(4);
    const recordSize = 1 + 4 + 1 + 1 + 2;
    expect(file.length).toBeGreaterThan(600 * recordSize);
  });
});
