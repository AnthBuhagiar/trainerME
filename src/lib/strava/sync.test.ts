import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-"));
process.env.TRAINERME_DATA_DIR = dir;
process.env.STRAVA_CLIENT_ID = "1";
process.env.STRAVA_CLIENT_SECRET = "secret";

const { syncStrava } = await import("@/lib/strava/sync");
const store = await import("@/lib/data/store");

function activity(id: number, day: number, sport = "Ride") {
  return {
    id,
    name: `Ride ${id}`,
    sport_type: sport,
    start_date_local: `2026-10-${String(day).padStart(2, "0")}T07:00:00Z`,
    trainer: false,
    distance: 30000,
    moving_time: 3600,
    elapsed_time: 3700,
    total_elevation_gain: 300,
    suffer_score: 50,
    timezone: "(GMT+10:00) Australia/Sydney",
  };
}

const streams = {
  time: { data: Array.from({ length: 600 }, (_, i) => i) },
  watts: { data: Array.from({ length: 600 }, () => 210) },
  heartrate: { data: Array.from({ length: 600 }, () => 140) },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Strava sync", () => {
  let streamCalls = 0;
  let rateLimitAfter = Infinity;

  beforeEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    store.writeJson("strava-tokens.json", { access_token: "a", refresh_token: "r", expires_at: Date.now() / 1000 + 3600 });
    streamCalls = 0;
    rateLimitAfter = Infinity;
    vi.stubGlobal("fetch", async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith("/athlete")) return json({ weight: 77, ftp: 208 });
      if (u.pathname.endsWith("/athlete/activities")) {
        return json(u.searchParams.get("page") === "1" ? [activity(1, 1), activity(2, 2, "WeightTraining"), activity(3, 3)] : []);
      }
      if (u.pathname.includes("/streams")) {
        if (++streamCalls > rateLimitAfter) return json({ message: "Rate Limit Exceeded" }, 429);
        return json(streams);
      }
      return json({}, 404);
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  test("imports activities and summarises ride streams only", async () => {
    const result = await syncStrava();
    expect(result).toMatchObject({ newActivities: 3, totalActivities: 3, streamsFetched: 2, ridesMissingStreams: 0, rateLimited: false });
    const rides = store.loadRides();
    expect(rides.map((r) => r.id)).toEqual(["1", "3"]);
    expect(rides[0].streams?.powerCurve?.["300"]).toBe(210);
    expect(store.loadSettings().timeZone).toBe("Australia/Sydney"); // so "today" is the rider's today
    expect(store.loadSettings().weightKg).toBe(77);
  });

  test("stops cleanly at the rate limit and resumes next time", async () => {
    rateLimitAfter = 1;
    const first = await syncStrava();
    expect(first).toMatchObject({ streamsFetched: 1, ridesMissingStreams: 1, rateLimited: true });
    rateLimitAfter = Infinity;
    const second = await syncStrava();
    expect(second).toMatchObject({ newActivities: 0, streamsFetched: 1, ridesMissingStreams: 0, rateLimited: false });
  });

  test("respects the per-run stream budget", async () => {
    const result = await syncStrava(1);
    expect(result).toMatchObject({ streamsFetched: 1, ridesMissingStreams: 1 });
  });
});
