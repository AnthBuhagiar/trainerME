import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-admin-"));
process.env.TRAINERME_DATA_DIR = dir;
process.env.SESSION_SECRET = "test-secret";

const store = await import("@/lib/data/store");
const owner = await import("@/lib/auth/owner");
const referral = await import("@/lib/referral/referral");
const seen = await import("@/lib/admin/seen");
const { buildAdminStats } = await import("@/lib/admin/stats");
const { compareWeeks, reasonFor } = await import("@/lib/admin/planUsage");
const { tokenMatches } = await import("@/lib/admin/auth");
const traffic = await import("@/lib/admin/traffic");

afterAll(() => {
  delete process.env.SESSION_SECRET;
  fs.rmSync(dir, { recursive: true, force: true });
});

const ride = (id: string, start: string) => ({
  id,
  name: "Ride",
  sport_type: "Ride",
  start_local: start,
  summary: { distance: 30000, moving_time: 3600, elapsed_time: 3700, elevation_gain: 200 },
});

describe("admin stats", () => {
  const now = new Date("2026-10-30T01:00:00Z");

  test("lists riders with account and usage only, and counts referrals", () => {
    owner.claimOwner(11);
    store.runAsAthlete(11, () => {
      store.writeJson("strava-tokens.json", { access_token: "a", refresh_token: "r", expires_at: 0, athlete: { id: 11, firstname: "Anthony", lastname: "Buhagiar" }, scope: "read,activity:read_all,profile:read_all,activity:write" });
      store.writeJson("terms.json", { version: "x", acceptedAt: "2026-09-01T00:00:00.000Z" });
      // A regular week (Tue, Thu, Sat) for twelve weeks, so the plan has a usual week to follow.
      const rides = [];
      for (let w = 0; w < 12; w++)
        for (const d of [2, 4, 6]) {
          const date = new Date(Date.UTC(2026, 7, 2 + w * 7 + d)).toISOString().slice(0, 10);
          rides.push(ride(`${w}-${d}`, `${date}T06:00:00`));
        }
      store.saveRawActivities(rides);
      store.writeJson("checkins.json", { "2026-10-21": "tired", "2026-09-01": "good" });
      seen.recordSeen(now);
      seen.recordSeen(now); // once a day only
    });
    const code = referral.ensureReferralCode(11);
    store.runAsAthlete(22, () => store.writeJson("strava-tokens.json", { access_token: "a", refresh_token: "r", expires_at: 0, athlete: { id: 22, firstname: "Sam" } }));
    referral.recordReferrer(22, code);

    const stats = buildAdminStats(now);
    expect(stats.summary.riders).toBe(2);
    const a = stats.riders.find((r) => r.athleteId === 11)!;
    expect(a.name).toBe("Anthony B.");
    expect(a.owner).toBe(true);
    expect(a.referralsMade).toBe(1);
    expect(a.rides).toBe(36);
    expect(a.ridesLast30).toBeGreaterThan(5);
    expect(a.checkInsLast30).toBe(1);
    expect(a.stravaUpload).toBe(true);
    expect(a.lastSeen).toBe("2026-10-30");
    expect(stats.riders.find((r) => r.athleteId === 22)!.joinedWithCode).toBe(code);
    expect(stats.summary.active7).toBe(1);
    expect(stats.dailyActive.at(-1)).toEqual({ date: "2026-10-30", riders: 1 });
    expect(store.runAsAthlete(11, () => seen.loadSeen().days)).toEqual(["2026-10-30"]);

    // The plan built from those rides is measured week by week.
    expect(stats.weeklyAdherence.length).toBeGreaterThan(0);
    expect(stats.workouts.length).toBeGreaterThan(0);
    expect(stats.summary.adherence8).not.toBeNull();

    // Nothing health-related or secret leaves the server.
    const text = JSON.stringify(stats);
    for (const word of ["tired", "access_token", "refresh_token", "Buhagiar", "weightKg", "heartrate"]) expect(text).not.toContain(word);
  });
});

describe("plan changes", () => {
  const s = (date: string, kind: "ride" | "strength", name: string, extra = {}) =>
    ({ date, weekday: 0, start: "06:00", minutes: 60, kind, indoor: true, why: "", ...(kind === "ride" ? { ride: { workout: { name } } } : { strength: { name } }), ...extra }) as never;
  const week = (sessions: unknown[]) => ({ weekStart: "2026-10-18", phase: "base", label: "", recovery: false, sessions }) as never;

  test("pairs each given session with the planned one", () => {
    const base = week([s("2026-10-20", "ride", "5 × 4 min VO2"), s("2026-10-21", "strength", "Heavy"), s("2026-10-24", "ride", "Long ride")]);
    const given = week([
      s("2026-10-20", "ride", "Endurance ride", { adjusted: "Tired: swapped for easy riding. Skipping is fine too." }),
      s("2026-10-22", "strength", "Heavy", { movedFrom: "2026-10-21", adjusted: "Moved from Tuesday: too close to your other strength day." }),
      s("2026-10-24", "ride", "Long ride", { adjusted: "Busy day: shortened to fit." }),
    ]);
    const out = compareWeeks(base, given, [true, false, true]);
    expect(out.map((o) => [o.planned, o.change, o.reason, o.became, o.done])).toEqual([
      ["5 × 4 min VO2", "swapped", "Tired check-in", "Endurance ride", true],
      ["Heavy", "moved", "Strength spacing", null, false],
      ["Long ride", "shortened", "Busy day", null, true],
    ]);
  });

  test("reasons come from the plan's own wording", () => {
    expect(reasonFor("Short on time: a shorter steady ride instead.")).toBe("Short on time");
    expect(reasonFor("Moved from Saturday: you're away that day.")).toBe("Away day");
    expect(reasonFor("Easier today: you rode hard yesterday.")).toBe("Hard day before");
  });
});

describe("access", () => {
  test("needs a long token, sent as a bearer token", () => {
    const token = "x".repeat(40);
    expect(tokenMatches(`Bearer ${token}`, token)).toBe(true);
    expect(tokenMatches(`Bearer ${token}y`, token)).toBe(false);
    expect(tokenMatches(token, token)).toBe(false);
    expect(tokenMatches("Bearer short", "short")).toBe(false);
    expect(tokenMatches(`Bearer ${token}`, undefined)).toBe(false);
  });
});

describe("traffic", () => {
  test("is left out without Cloudflare settings", async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    expect((await traffic.fetchTraffic()).configured).toBe(false);
  });

  test("splits Cloudflare's counts into app and website", async () => {
    process.env.CLOUDFLARE_API_TOKEN = "t";
    process.env.CLOUDFLARE_ZONE_ID = "z";
    process.env.APP_URL = "https://hourpowerapp.cc";
    traffic.clearTrafficCache();
    const g = (count: number, dimensions: Record<string, string>) => ({ count, sum: { visits: Math.ceil(count / 2) }, dimensions });
    const data = {
      daily: [g(10, { date: "2026-10-29", clientRequestHTTPHost: "hourpowerapp.cc" }), g(4, { date: "2026-10-29", clientRequestHTTPHost: "www.hourpowerapp.cc" })],
      countries: [g(8, { clientCountryName: "AU", clientRequestHTTPHost: "hourpowerapp.cc" }), g(2, { clientCountryName: "NZ", clientRequestHTTPHost: "www.hourpowerapp.cc" })],
      paths: [g(5, { clientRequestPath: "/", clientRequestHTTPHost: "hourpowerapp.cc" }), g(3, { clientRequestPath: "/api/x", clientRequestHTTPHost: "hourpowerapp.cc" })],
      referrers: [g(4, { clientRefererHost: "www.instagram.com", clientRequestHTTPHost: "www.hourpowerapp.cc" }), g(4, { clientRefererHost: "www.hourpowerapp.cc", clientRequestHTTPHost: "hourpowerapp.cc" })],
      devices: [g(6, { clientDeviceType: "mobile", clientRequestHTTPHost: "hourpowerapp.cc" })],
    };
    const fake = (async () => new Response(JSON.stringify({ data: { viewer: { zones: [data] } } }))) as typeof fetch;
    const t = await traffic.fetchTraffic(new Date("2026-10-30T00:00:00Z"), fake);
    expect(t.error).toBeUndefined();
    expect(t.daily).toEqual([
      { date: "2026-10-29", section: "App", pageViews: 10, visits: 5 },
      { date: "2026-10-29", section: "Website", pageViews: 4, visits: 2 },
    ]);
    expect(t.countries.map((c) => [c.country, c.section])).toEqual([["AU", "App"], ["NZ", "Website"]]);
    expect(t.paths.map((p) => p.path)).toEqual(["/"]);
    expect(t.referrers.map((r) => r.referrer)).toEqual(["www.instagram.com"]);
  });
});
