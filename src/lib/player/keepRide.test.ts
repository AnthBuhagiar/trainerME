import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import type { RawActivity } from "@/lib/data/store";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-keep-"));
const store = await import("@/lib/data/store");
const { keepRide, keptSamples } = await import("@/lib/player/keepRide");

const start = Date.parse("2026-11-03T08:30:00Z"); // 7:30 pm in Sydney
const samples = Array.from({ length: 1800 }, (_, t) => ({ t, power: 200, cadence: 90, hr: 140 }));

describe("rides ridden in the player", () => {
  beforeEach(() => {
    fs.rmSync(store.DATA_DIR, { recursive: true, force: true });
    store.saveSettings({ ...store.loadSettings(), timeZone: "Australia/Sydney" });
  });

  test("are kept in Hour Power, on the rider's local day, with their power", () => {
    keepRide("2 × 15 min threshold", start, samples);
    keepRide("2 × 15 min threshold", start, samples); // a retry doesn't make a second copy
    const rides = store.loadRides();
    expect(rides).toHaveLength(1);
    expect(rides[0]).toMatchObject({ name: "2 × 15 min threshold", startLocal: "2026-11-03T19:30:00", indoor: true, movingTime: 1800 });
    expect(rides[0].streams?.avgWatts).toBe(200);
    expect(rides[0].distance / 1000).toBeGreaterThan(14); // half an hour at 200 W on the flat: ~16 km
    expect(rides[0].distance / 1000).toBeLessThan(18);
    expect(keptSamples(rides[0].id)).toHaveLength(1800); // every second, for a .fit download later
  });

  test("become one ride with Strava's copy once it syncs, showing Strava's", () => {
    keepRide("2 × 15 min threshold", start, samples);
    const strava: RawActivity = {
      id: "999", source: "strava", name: "2 × 15 min threshold", sport_type: "VirtualRide", start_local: "2026-11-03T19:30:00", is_trainer: true,
      summary: { distance: 0, moving_time: 1790, elapsed_time: 1800, elevation_gain: 0 },
    };
    store.saveRawActivities([...store.loadRawActivities(), strava]);
    store.saveRideSummary({ id: "999", samples: 1800, v: 2, avg_watts: 200 });
    expect(store.loadActivities().map((a) => a.id)).toEqual(["999"]);
  });
});
