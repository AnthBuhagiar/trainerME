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
});
