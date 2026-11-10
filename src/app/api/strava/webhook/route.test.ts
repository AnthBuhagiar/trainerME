import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// A synthetic hosted server with two synthetic riders: never a real rider's data.
process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-webhook-"));
process.env.SESSION_SECRET = "synthetic-session-secret";
process.env.STRAVA_CLIENT_ID = "1";
process.env.STRAVA_CLIENT_SECRET = "synthetic";
const store = await import("@/lib/data/store");
const { saveTokens } = await import("@/lib/strava/client");
const revocation = await import("@/lib/auth/revocation");
const { auditLog } = await import("@/lib/security/audit");
const { resetRateLimits } = await import("@/lib/security/rateLimit");
const { stravaAccess } = await import("@/lib/strava/client");
const { POST } = await import("./route");

const RIDER = 101;
const OTHER = 202;
const deauth = (owner = RIDER, extra: Record<string, unknown> = {}) =>
  new NextRequest("https://example.test/api/strava/webhook", {
    method: "POST",
    body: JSON.stringify({ object_type: "athlete", aspect_type: "update", owner_id: owner, updates: { authorized: "false" }, ...extra }),
  });
const folder = (id: number) => store.athleteDir(id);
const as = <T>(id: number, fn: () => T) => store.runAsAthlete(id, fn);
const strava = (status: number) => vi.stubGlobal("fetch", async () => new Response(status === 200 ? JSON.stringify({ id: RIDER }) : "{}", { status }));

describe("Strava deauthorization webhook", () => {
  beforeEach(() => {
    fs.rmSync(store.DATA_DIR, { recursive: true, force: true });
    resetRateLimits();
    for (const id of [RIDER, OTHER]) {
      as(id, () => {
        saveTokens({ access_token: "AT-synthetic", refresh_token: "RT-synthetic", expires_at: Date.now() / 1000 + 3600 });
        store.writeJson("goals.json", [{ id: "g" }]);
      });
    }
  });
  afterEach(() => vi.unstubAllGlobals());

  test("a forged event changes nothing while Strava still accepts the tokens", async () => {
    strava(200);
    expect((await POST(deauth())).status).toBe(200);
    expect(as(RIDER, revocation.stravaRevocation)).toBeNull();
    expect(fs.existsSync(path.join(folder(RIDER), "goals.json"))).toBe(true);
  });

  test("a Strava outage, rate limit or network error never counts as revoked", async () => {
    for (const status of [500, 503, 429]) {
      strava(status);
      await POST(deauth());
    }
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    await POST(deauth());
    expect(as(RIDER, revocation.stravaRevocation)).toBeNull();
    expect(fs.existsSync(path.join(folder(RIDER), "goals.json"))).toBe(true);
  });

  test("a confirmed revocation marks the rider, keeps their data, stops sync; a repeat changes nothing", async () => {
    strava(401);
    await POST(deauth());
    const first = as(RIDER, revocation.stravaRevocation);
    expect(first).not.toBeNull();
    expect(Date.parse(first!.purgeAfter) - Date.parse(first!.revokedAt)).toBe(revocation.GRACE_DAYS * 86_400_000);
    expect(fs.existsSync(path.join(folder(RIDER), "goals.json"))).toBe(true); // marked, not erased
    expect(as(OTHER, revocation.stravaRevocation)).toBeNull(); // nobody else touched

    await POST(deauth()); // Strava (or anyone) sends it again
    expect(as(RIDER, revocation.stravaRevocation)).toEqual(first);

    // Sync refuses while revoked (single-rider mode here, so the route needs no session cookie).
    const { POST: sync } = await import("@/app/api/strava/sync/route");
    delete process.env.SESSION_SECRET;
    try {
      store.writeJson("revoked.json", first);
      const asked = vi.fn(async () => new Response("{}"));
      vi.stubGlobal("fetch", asked);
      expect((await sync()).status).toBe(409);
      expect(asked).not.toHaveBeenCalled(); // Strava isn't even contacted
    } finally {
      process.env.SESSION_SECRET = "synthetic-session-secret";
    }
  });

  test("data is deleted only after the grace period, and only if Strava still refuses then", async () => {
    strava(401);
    await POST(deauth());
    const due = new Date(Date.now() + (revocation.GRACE_DAYS + 1) * 86_400_000);

    expect(await revocation.purgeDueRevocations(stravaAccess, new Date())).toEqual([]); // too early
    strava(503);
    expect(await revocation.purgeDueRevocations(stravaAccess, due)).toEqual([]); // can't tell: try later
    expect(fs.existsSync(folder(RIDER))).toBe(true);

    strava(401);
    expect(await revocation.purgeDueRevocations(stravaAccess, due)).toEqual([RIDER]);
    expect(fs.existsSync(folder(RIDER))).toBe(false);
    expect(fs.existsSync(path.join(folder(OTHER), "goals.json"))).toBe(true);
  });

  test("signing in again (or Strava accepting again) cancels the deletion", async () => {
    strava(401);
    await POST(deauth());
    expect(as(RIDER, revocation.clearStravaRevocation)).toBe(true);
    const due = new Date(Date.now() + (revocation.GRACE_DAYS + 1) * 86_400_000);
    expect(await revocation.purgeDueRevocations(stravaAccess, due)).toEqual([]);

    await POST(deauth());
    strava(200); // re-authorized by the time it's due
    expect(await revocation.purgeDueRevocations(stravaAccess, due)).toEqual([]);
    expect(as(RIDER, revocation.stravaRevocation)).toBeNull();
    expect(fs.existsSync(path.join(folder(RIDER), "goals.json"))).toBe(true);
  });

  test("events for unknown athletes or another subscription do nothing; every decision is audited without secrets", async () => {
    strava(401);
    await POST(deauth(999));
    process.env.STRAVA_SUBSCRIPTION_ID = "12345";
    await POST(deauth(RIDER, { subscription_id: 1 }));
    delete process.env.STRAVA_SUBSCRIPTION_ID;
    expect(as(RIDER, revocation.stravaRevocation)).toBeNull();
    await POST(deauth());
    const log = JSON.stringify(auditLog());
    expect(log).toContain("marked revoked");
    expect(log).toContain("not a rider here");
    expect(log).not.toMatch(/synthetic/i);
  });
});
