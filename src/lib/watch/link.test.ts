import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-link-"));
process.env.TRAINERME_DATA_DIR = dir;

const link = await import("@/lib/watch/link");
const key = await import("@/lib/watch/key");

afterAll(() => {
  delete process.env.SESSION_SECRET;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("linking a watch from the phone", () => {
  test("code shown, entered on the phone, key collected once", () => {
    const start = link.startLink()!;
    expect(start.code).toMatch(/^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    expect(start.expiresIn).toBe(600);
    expect(link.collectLink(start.token)).toEqual({ status: "waiting" });

    // Typed any old way on the phone.
    expect(link.confirmLink(` ${start.code.toLowerCase().replace("-", " ")} `, null)).toBe(true);
    const got = link.collectLink(start.token);
    expect(got.status).toBe("linked");
    const k = (got as { key: string }).key;
    expect(key.athleteForWatchKey(k)).toBe(0);

    // Once only, and the code can't be used again.
    expect(link.collectLink(start.token)).toEqual({ status: "expired" });
    expect(link.confirmLink(start.code, null)).toBe(false);
    // Nothing secret kept in plain.
    expect(fs.readFileSync(path.join(dir, "watch-links.json"), "utf8")).not.toContain(start.token);
  });

  test("a wrong code, or a lapsed one, links nothing", () => {
    const now = Date.now();
    const start = link.startLink(now)!;
    expect(link.confirmLink("AAAAAA", null, now)).toBe(false);
    expect(link.confirmLink("short", null, now)).toBe(false);
    const later = now + 11 * 60_000;
    expect(link.confirmLink(start.code, null, later)).toBe(false);
    expect(link.collectLink(start.token, later)).toEqual({ status: "expired" });
  });

  test("a confirmed link waits a little for the watch to check back", () => {
    const now = Date.now();
    const start = link.startLink(now)!;
    const late = now + 9.9 * 60_000;
    expect(link.confirmLink(start.code, null, late)).toBe(true);
    expect(link.collectLink(start.token, late + 60_000).status).toBe("linked");
  });

  test("a token the watch didn't get is turned away", () => {
    expect(link.collectLink(null)).toEqual({ status: "expired" });
    expect(link.collectLink("nope")).toEqual({ status: "expired" });
    expect(link.collectLink("0".repeat(48))).toEqual({ status: "expired" });
  });

  test("hosted: the watch gets a key for the rider who entered the code", () => {
    process.env.SESSION_SECRET = "test-secret";
    try {
      const a = link.startLink()!;
      const b = link.startLink()!;
      expect(link.confirmLink(a.code, 11)).toBe(true);
      expect(link.confirmLink(b.code, 22)).toBe(true);
      const ka = (link.collectLink(a.token) as { key: string }).key;
      const kb = (link.collectLink(b.token) as { key: string }).key;
      expect(key.athleteForWatchKey(ka)).toBe(11);
      expect(key.athleteForWatchKey(kb)).toBe(22);
      expect(fs.existsSync(path.join(dir, "athletes", "11", "watch.json"))).toBe(true);
    } finally {
      delete process.env.SESSION_SECRET;
    }
  });
});
