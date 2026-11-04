import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-fit-"));
process.env.STRAVA_CLIENT_ID = "1";
process.env.STRAVA_CLIENT_SECRET = "secret";
const store = await import("@/lib/data/store");
const { fitCrc } = await import("@/lib/export/fit");
const { GET } = await import("./route");

describe(".fit download of a Strava ride", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("is built from Strava's streams, GPS included", async () => {
    store.writeJson("strava-tokens.json", { access_token: "a", refresh_token: "r", expires_at: Date.now() / 1000 + 3600 });
    store.saveSettings({ ...store.loadSettings(), timeZone: "Australia/Sydney" });
    store.saveRawActivities([
      { id: "42", source: "strava", name: "Morning ride", sport_type: "Ride", start_local: "2026-11-04T06:00:00", summary: { distance: 900, moving_time: 100, elapsed_time: 100, elevation_gain: 10 } },
    ]);
    const n = 100;
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      asked.push(url);
      return new Response(
        JSON.stringify({
          time: { data: Array.from({ length: n }, (_, i) => i) },
          watts: { data: Array(n).fill(210) },
          heartrate: { data: Array(n).fill(150) },
          distance: { data: Array.from({ length: n }, (_, i) => i * 9) },
          latlng: { data: Array(n).fill([-34.4, 150.9]) },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const res = await GET(new Request("http://x/api/activities/42/fit"), { params: Promise.resolve({ id: "42" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("Morning ride.fit");
    expect(asked[0]).toContain("/activities/42/streams");
    const file = new Uint8Array(await res.arrayBuffer());
    expect(String.fromCharCode(...file.subarray(8, 12))).toBe(".FIT");
    expect(fitCrc(file)).toBe(0);
  });

  test("says so for an activity it can't download", async () => {
    const res = await GET(new Request("http://x/api/activities/nope/fit"), { params: Promise.resolve({ id: "nope" }) });
    expect(res.status).toBe(404);
  });
});
