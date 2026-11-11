import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-gym-"));
process.env.STRAVA_CLIENT_ID = "1";
process.env.STRAVA_CLIENT_SECRET = "synthetic";
const store = await import("@/lib/data/store");
const { saveTokens } = await import("@/lib/strava/client");
const { logStrength, strengthLogged, unlogStrength } = await import("@/lib/plan/strengthLog");
const { applyCompletions, loadCompletions } = await import("@/lib/plan/completions");
const { weekStatus } = await import("@/lib/plan/weekStrip");
import { STRENGTH, type PlannedSession, type WeekPlan } from "@/lib/plan/week";

const gym: PlannedSession = { date: "2026-11-10", weekday: 2, start: "18:00", minutes: 50, kind: "strength", indoor: true, strength: STRENGTH.heavy, why: "" };
const tokens = (scope: string) => saveTokens({ access_token: "AT-synthetic", refresh_token: "RT-synthetic", expires_at: Date.now() / 1000 + 3600, scope });
const WRITE = "read,activity:read_all,profile:read_all,activity:write";

describe("logging a gym session with Done it", () => {
  let posts: { url: string; body: string }[] = [];
  beforeEach(() => {
    fs.rmSync(store.DATA_DIR, { recursive: true, force: true });
    posts = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      posts.push({ url: String(url), body: String(init.body ?? "") });
      return new Response(JSON.stringify({ id: 98765 }), { status: 201 });
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  test("counts it on that day and saves it to Strava as Weight Training, once", async () => {
    tokens(WRITE);
    expect(await logStrength(gym)).toEqual({ stravaId: 98765 });
    const [kept] = store.loadRawActivities();
    expect(kept).toMatchObject({ source: "hourpower", sport_type: "WeightTraining", start_local: "2026-11-10T18:00:00", name: "Heavy strength" });
    expect(kept.summary.moving_time).toBe(50 * 60);

    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe("https://www.strava.com/api/v3/activities");
    const sent = new URLSearchParams(posts[0].body);
    expect(sent.get("sport_type")).toBe("WeightTraining");
    expect(sent.get("start_date_local")).toBe("2026-11-10T18:00:00");
    expect(sent.get("elapsed_time")).toBe("3000");
    expect(sent.get("description")).toContain(STRENGTH.heavy.items[0]);
    expect(posts[0].body).not.toContain("synthetic"); // no token in the activity

    expect(await logStrength(gym)).toEqual({ stravaId: 98765 }); // tapped again: nothing new on Strava
    expect(posts).toHaveLength(1);
    expect(strengthLogged(gym)).toEqual({ stravaId: 98765 });
  });

  test("without the upload permission, or if Strava fails, it still counts in Hour Power", async () => {
    tokens("read,activity:read_all,profile:read_all");
    expect(await logStrength(gym)).toMatchObject({ reconnect: true });
    expect(posts).toHaveLength(0);
    expect(strengthLogged(gym)).toEqual({ stravaId: undefined });

    tokens(WRITE);
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
    const second = await logStrength(gym);
    expect(second.stravaError).toBeTruthy();
    expect(store.loadRawActivities()).toHaveLength(1);
  });

  test("the session counts as done, and Strava's copy when it syncs is the same activity", async () => {
    tokens(WRITE);
    await logStrength(gym);
    const week: WeekPlan = { weekStart: "2026-11-08", phase: "base", label: "", recovery: false, sessions: [gym] };
    const marked = applyCompletions(week, loadCompletions());
    expect(weekStatus(marked, store.loadActivities(), "2026-11-11", () => "Heavy strength").covered.has(marked.sessions[0])).toBe(true);

    // Strava's copy syncs in: one activity, Strava's.
    store.saveRawActivities([
      ...store.loadRawActivities(),
      { id: "98765", source: "strava", name: "Heavy strength", sport_type: "WeightTraining", start_local: "2026-11-10T18:00:00", summary: { distance: 0, moving_time: 3000, elapsed_time: 3000, elevation_gain: 0 } },
    ]);
    expect(store.loadActivities().map((a) => a.id)).toEqual(["98765"]);
  });

  test("undo removes it from Hour Power and says Strava still has it", async () => {
    tokens(WRITE);
    await logStrength(gym);
    expect(unlogStrength(gym)).toEqual({ stravaId: 98765 });
    expect(strengthLogged(gym)).toBeNull();
    expect(store.loadRawActivities()).toHaveLength(0);
  });
});
