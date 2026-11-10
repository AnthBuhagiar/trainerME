import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Single-rider mode on a synthetic data folder (routes need no session cookie).
process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-limits-"));
delete process.env.SESSION_SECRET;
const { readJsonBody, BodyTooLarge, badBody } = await import("@/lib/security/requests");
const { resetRateLimits } = await import("@/lib/security/rateLimit");

const post = (url: string, body: string, ip = "203.0.113.5", headers: Record<string, string> = {}) =>
  new Request(`https://example.test${url}`, { method: "POST", body, headers: { "content-type": "application/json", "x-forwarded-for": ip, ...headers } });

describe("request bodies", () => {
  test("are read up to the cap and refused past it, whether or not the size is declared", async () => {
    expect(await readJsonBody(post("/x", '{"a":1}'), 100)).toEqual({ a: 1 });
    await expect(readJsonBody(post("/x", "x".repeat(10), undefined, { "content-length": "999999" }), 100)).rejects.toBeInstanceOf(BodyTooLarge);
    const stream = new ReadableStream({
      start(c) {
        for (let i = 0; i < 50; i++) c.enqueue(new TextEncoder().encode("x".repeat(100)));
        c.close();
      },
    });
    const undeclared = new Request("https://example.test/x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readJsonBody(undeclared, 1000)).rejects.toBeInstanceOf(BodyTooLarge);
    expect(badBody(new BodyTooLarge(1)).status).toBe(413);
    expect(badBody(new SyntaxError("x")).status).toBe(400);
  });
});

describe("rate limits and caps on routes", () => {
  beforeEach(() => resetRateLimits());

  test("check-in: oversized and unreadable bodies are refused; 30 a minute, then 429", async () => {
    const { POST } = await import("@/app/api/checkin/route");
    expect((await POST(post("/api/checkin", "x".repeat(5000)))).status).toBe(413);
    expect((await POST(post("/api/checkin", "{not json"))).status).toBe(400);
    const body = JSON.stringify({ date: "2026-11-10", mood: "good" });
    const codes = [];
    for (let i = 0; i < 31; i++) codes.push((await POST(post("/api/checkin", body))).status);
    expect(codes.filter((c) => c === 200).length).toBeLessThanOrEqual(30);
    expect(codes.at(-1)).toBe(429);
  });

  test("watch linking: a few new links per client, so nobody can use up the places", async () => {
    const { POST } = await import("@/app/api/watch/link/route");
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await POST(post("/api/watch/link", "", "198.51.100.1"))).status);
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
    expect((await POST(post("/api/watch/link", "", "198.51.100.2"))).status).toBe(200); // another watch is fine
  });

  test("watch link codes can't be guessed: ten tries, then 429", async () => {
    const { POST } = await import("@/app/api/watch/link/confirm/route");
    const codes = [];
    for (let i = 0; i < 11; i++) codes.push((await POST(post("/api/watch/link/confirm", JSON.stringify({ code: `ZZZZ${i}A` })))).status);
    expect(codes.slice(0, 10).every((c) => c === 404)).toBe(true);
    expect(codes[10]).toBe(429);
    expect((await POST(post("/api/watch/link/confirm", "x".repeat(2000), "198.51.100.3"))).status).toBe(413);
  });

  test("ride uploads: capped in size and length, rate limited", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await import("@/app/api/rides/upload/route");
    const tooLong = { name: "Ride", startMs: Date.now(), samples: Array.from({ length: 12 * 3600 + 1 }, (_, t) => ({ t })) };
    expect((await POST(post("/api/rides/upload", JSON.stringify(tooLong)))).status).toBe(413);
    expect((await POST(post("/api/rides/upload", "x".repeat(9 * 1024 * 1024)))).status).toBe(413);
    expect((await POST(post("/api/rides/upload", JSON.stringify({ name: "", startMs: 1, samples: [{ t: 0 }] })))).status).toBe(400);
    const codes = [];
    for (let i = 0; i < 12; i++) codes.push((await POST(post("/api/rides/upload", JSON.stringify({ samples: [] })))).status);
    expect(codes.at(-1)).toBe(429);
    vi.restoreAllMocks();
  });

  test("check-in from the watch: capped and rate limited too", async () => {
    const { createWatchKey } = await import("@/lib/watch/key");
    const key = createWatchKey(null);
    const { POST } = await import("@/app/api/watch/checkin/route");
    const req = (body: string) => post("/api/watch/checkin", body, "203.0.113.7", { authorization: `Bearer ${key}` });
    expect((await POST(req("x".repeat(5000)))).status).toBe(413);
    const codes = [];
    for (let i = 0; i < 31; i++) codes.push((await POST(req(JSON.stringify({ mood: "good" })))).status);
    expect(codes.at(-1)).toBe(429);
  });
});
