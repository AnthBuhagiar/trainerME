import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-upload-"));
process.env.STRAVA_CLIENT_ID = "1";
process.env.STRAVA_CLIENT_SECRET = "secret";

const { buildTcx } = await import("@/lib/strava/tcx");
const { canUpload, stravaUpload } = await import("@/lib/strava/client");
const { writeJson } = await import("@/lib/data/store");

describe("TCX", () => {
  test("one trackpoint per second with power, cadence and heart rate", () => {
    const tcx = buildTcx(Date.UTC(2026, 9, 21, 8, 30), [
      { t: 0, power: 150, cadence: 88, hr: 120 },
      { t: 1, power: 210.4 },
    ]);
    expect(tcx).toContain("<Id>2026-10-21T08:30:00Z</Id>");
    expect(tcx.match(/<Trackpoint>/g)).toHaveLength(2);
    expect(tcx).toContain("<Time>2026-10-21T08:30:01Z</Time>");
    expect(tcx).toContain("<ns3:Watts>210</ns3:Watts>");
    expect(tcx).toContain("<HeartRateBpm><Value>120</Value></HeartRateBpm><Cadence>88</Cadence>");
    expect(tcx).toContain("<ns3:AvgWatts>180</ns3:AvgWatts>");
  });
});

describe("Strava upload", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("needs the write permission", () => {
    expect(canUpload({ access_token: "a", refresh_token: "r", expires_at: 0, scope: "read,activity:read_all" })).toBe(false);
    expect(canUpload({ access_token: "a", refresh_token: "r", expires_at: 0, scope: "read,activity:write" })).toBe(true);
  });

  test("uploads, then waits for the activity id", async () => {
    vi.useFakeTimers();
    writeJson("strava-tokens.json", { access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, scope: "activity:write" });
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      calls.push(`${init.method ?? "GET"} ${url}`);
      if (init.method === "POST") {
        const form = init.body as FormData;
        expect(form.get("data_type")).toBe("tcx");
        expect(form.get("trainer")).toBe("1");
        return new Response(JSON.stringify({ id: 9, status: "Your activity is still being processed.", error: null, activity_id: null }));
      }
      return new Response(JSON.stringify({ id: 9, status: "Your activity is ready.", error: null, activity_id: 123 }));
    });
    const pending = stravaUpload("<tcx/>", { name: "2 × 15 min threshold", externalId: "hourpower-1" });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toEqual({ activityId: 123, status: "Your activity is ready.", error: undefined });
    expect(calls).toEqual(["POST https://www.strava.com/api/v3/uploads", "GET https://www.strava.com/api/v3/uploads/9"]);
    vi.useRealTimers();
  });
});
