import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-icu-"));
process.env.INTERVALS_API_KEY = "k";
const { syncIntervals } = await import("@/lib/intervals/sync");
const store = await import("@/lib/data/store");

const stravaRide = { id: "111", source: "strava" as const, name: "Strava copy", sport_type: "Ride", start_local: "2026-10-10T05:00:00", summary: { distance: 90_000, moving_time: 10_800, elapsed_time: 11_000, elevation_gain: 900 } };

describe("Intervals.icu sync", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("adds rides, skips what it can't share, downloads streams only where Strava has none", async () => {
    store.saveRawActivities([stravaRide]);
    store.saveRideSummary({ id: "111", samples: 10 }); // Strava already has streams for the Saturday ride
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url.replace("https://intervals.icu/api/v1", ""));
      if (url.includes("/activities?")) {
        return new Response(
          JSON.stringify([
            { id: "i900", name: "Garmin copy", type: "Ride", start_date_local: "2026-10-10T05:00:40", moving_time: 10_750, distance: 90_100 },
            { id: "i901", name: "Zwift", type: "VirtualRide", start_date_local: "2026-10-14T19:30:00", moving_time: 3600, distance: 30_000 },
            { id: "i902", _note: "STRAVA activities are not available via the API" },
          ]),
        );
      }
      return new Response(JSON.stringify([{ type: "time", data: [0, 1, 2] }, { type: "watts", data: [200, 210, 220] }]));
    });
    const result = await syncIntervals(80, Date.parse("2026-10-20T00:00:00Z"));
    expect(result).toEqual({ newActivities: 2, streamsFetched: 1 });
    expect(calls.filter((c) => c.includes("/streams"))).toEqual(["/activity/901/streams?types=time,watts,heartrate,cadence,temp"]);
    expect(store.hasRideSummary("i901")).toBe(true);
    // The Garmin copy of the Strava ride collapses into one activity.
    const names = store.loadActivities().map((a) => a.name);
    expect(names).toEqual(["Strava copy", "Zwift"]);
  });

  test("does nothing without a key", async () => {
    delete process.env.INTERVALS_API_KEY;
    expect(await syncIntervals()).toBeNull();
    process.env.INTERVALS_API_KEY = "k";
  });
});
