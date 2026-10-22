import { describe, expect, test } from "vitest";
import { createSession, verifySession } from "@/lib/auth/session";

describe("session cookie", () => {
  test("round-trips for the right secret", async () => {
    const c = await createSession(42, "s3cret", 1_000);
    expect(await verifySession(c, "s3cret", 2_000)).toBe(42);
  });

  test("rejects tampering, wrong secrets and expiry", async () => {
    const c = await createSession(42, "s3cret", 1_000);
    expect(await verifySession(c.replace(/^42/, "43"), "s3cret", 2_000)).toBeNull();
    expect(await verifySession(c, "other", 2_000)).toBeNull();
    expect(await verifySession(c, "s3cret", 1_000 + 181 * 86_400_000)).toBeNull();
    expect(await verifySession(undefined, "s3cret")).toBeNull();
    expect(await verifySession("garbage", "s3cret")).toBeNull();
  });
});
