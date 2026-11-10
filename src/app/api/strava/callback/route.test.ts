import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("Strava sign-in callback", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret");
    vi.stubEnv("APP_URL", "https://example.test");
  });
  afterEach(() => vi.unstubAllEnvs());

  const callback = (query: string, cookie?: string) =>
    new NextRequest(`https://example.test/api/strava/callback?${query}`, { headers: cookie ? { cookie } : {} });

  test("refuses a sign-in this browser didn't start", async () => {
    const { GET } = await import("./route");
    const scope = "scope=read,activity:read_all,profile:read_all&code=abc";
    for (const req of [callback(`${scope}&state=x`), callback(`${scope}&state=x`, "hp_oauth=y"), callback(scope, "hp_oauth=y")]) {
      const res = await GET(req);
      expect(res.headers.get("location")).toBe("https://example.test/login?error=expired");
    }
  });

  test("only goes back to a path on this app", async () => {
    const { safeNext } = await import("@/lib/strava/client");
    expect(safeNext("/ride/2026-11-03?start=19:30")).toBe("/ride/2026-11-03?start=19:30");
    for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "", null]) expect(safeNext(bad)).toBeNull();
  });

  test("the first rider to sign in to a fresh hosted server does not become its owner", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-owner-"));
    vi.stubEnv("TRAINERME_DATA_DIR", dir);
    vi.stubEnv("STRAVA_CLIENT_ID", "1");
    vi.stubEnv("STRAVA_CLIENT_SECRET", "synthetic");
    vi.stubEnv("OWNER_ATHLETE_ID", "");
    vi.resetModules(); // the store reads TRAINERME_DATA_DIR when loaded
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", async (url: string) =>
      String(url).includes("/oauth/token")
        ? new Response(JSON.stringify({ access_token: "AT-synthetic", refresh_token: "RT-synthetic", expires_at: Date.now() / 1000 + 3600, athlete: { id: 555 } }))
        : new Response("[]"),
    );
    const { GET } = await import("./route");
    const res = await GET(callback("scope=read,activity:read_all,profile:read_all&code=abc&state=s1", "hp_oauth=s1"));
    expect(res.headers.get("location")).toBe("https://example.test/?strava=connected"); // signed in fine
    const { ownerId } = await import("@/lib/auth/owner");
    const { canSeeAdmin } = await import("@/lib/admin/access");
    expect(fs.existsSync(path.join(dir, "owner.json"))).toBe(false);
    expect(ownerId()).toBeNull();
    expect(canSeeAdmin(555)).toBe(false);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
