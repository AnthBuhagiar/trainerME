import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

// Without a rider zone the app falls back to the server's clock; this test is written for a UTC server
// (as hosted), so pin it rather than depend on the machine running the tests.
process.env.TZ = "UTC";
process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-tz-"));
const store = await import("@/lib/data/store");
const { keepRide } = await import("@/lib/player/keepRide");
const { markRidden, loadCompletions } = await import("@/lib/plan/completions");
const { setRiderTimeZone, validZone } = await import("@/lib/plan/timeZone");

describe("rider's time zone", () => {
  test("only real zone names count", () => {
    expect(validZone("Australia/Sydney")).toBe("Australia/Sydney");
    for (const bad of ["UTC", "Mars/Olympus", "", 5, undefined]) expect(validZone(bad)).toBeNull();
  });

  test("set from the phone, it re-times rides saved without it, and the sessions they did", () => {
    const start = Date.parse("2026-11-03T08:43:00Z"); // 7:43 pm in Sydney
    const ride = keepRide("2 × 15 min threshold", start, [{ t: 0, power: 200 }, { t: 1, power: 200 }]);
    expect(ride.start_local).toBe("2026-11-03T08:43:00"); // no zone yet: the server's clock (UTC)
    markRidden("2026-11-03", "19:30", ride.start_local);

    expect(setRiderTimeZone("Australia/Sydney")).toBe(true);
    expect(store.loadActivities()[0].startLocal).toBe("2026-11-03T19:43:00");
    expect(loadCompletions()["2026-11-03 19:30"].ride).toBe("2026-11-03T19:43:00");
    expect(setRiderTimeZone("Australia/Sydney")).toBe(false); // unchanged: nothing to do
  });
});
