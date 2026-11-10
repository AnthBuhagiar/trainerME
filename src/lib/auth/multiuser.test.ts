import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test, vi } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-multi-"));
process.env.TRAINERME_DATA_DIR = dir;
process.env.SESSION_SECRET = "test-secret";

const store = await import("@/lib/data/store");
const owner = await import("@/lib/auth/owner");
const backup = await import("@/lib/data/backup");

afterAll(() => {
  delete process.env.SESSION_SECRET;
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("several athletes on one server", () => {
  test("each athlete reads and writes only their own folder", () => {
    store.runAsAthlete(1, () => store.saveSettings({ weightKg: 77, acceptedFtp: 208, bikeWeightKg: 8.5 }));
    store.runAsAthlete(2, () => store.saveSettings({ weightKg: 60, acceptedFtp: 180, bikeWeightKg: 7 }));
    expect(store.runAsAthlete(1, () => store.loadSettings().weightKg)).toBe(77);
    expect(store.runAsAthlete(2, () => store.loadSettings().weightKg)).toBe(60);
    expect(fs.existsSync(path.join(dir, "athletes", "2", "settings.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "settings.json"))).toBe(false);
  });

  test("with sign-in on, nothing is read or written without a signed-in athlete", () => {
    expect(() => store.loadSettings()).toThrow(/signed-in athlete/);
    expect(() => store.writeJson("x.json", {})).toThrow();
  });

  test("caches don't leak between athletes", () => {
    const write = (id: number, name: string) =>
      store.runAsAthlete(id, () => store.saveRawActivities([{ id: `${id}`, name, sport_type: "Ride", start_local: "2026-10-01T07:00:00", summary: { distance: 1, moving_time: 3600, elapsed_time: 3600, elevation_gain: 0 } }]));
    write(1, "Mine");
    write(2, "Theirs");
    expect(store.runAsAthlete(1, () => store.loadActivities()[0].name)).toBe("Mine");
    expect(store.runAsAthlete(2, () => store.loadActivities()[0].name)).toBe("Theirs");
  });

  test("bad ids never become paths", () => {
    expect(() => store.runAsAthlete(-1, () => 0)).toThrow();
    expect(() => store.runAsAthlete(1.5, () => 0)).toThrow();
  });

  test("the configured owner gets the data from before", () => {
    fs.writeFileSync(path.join(dir, "goals.json"), "[]");
    fs.writeFileSync(path.join(dir, "referral-codes.json"), '{"codes":{}}');
    process.env.OWNER_ATHLETE_ID = "1";
    try {
      expect(owner.ownerId()).toBe(1);
      expect(owner.moveSingleRiderData(1)).toBe(1);
      expect(fs.existsSync(path.join(dir, "athletes", "1", "goals.json"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "owner.json"))).toBe(false); // nothing is claimed by signing in
      expect(fs.existsSync(path.join(dir, "referral-codes.json"))).toBe(true); // server-wide: stays put
      expect(owner.athleteIds().sort()).toEqual([1, 2]);
    } finally {
      delete process.env.OWNER_ATHLETE_ID;
    }
  });

  test("nobody becomes owner by signing in first: no setting, no owner (admin off)", async () => {
    const { canSeeAdmin } = await import("@/lib/admin/access");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.OWNER_ATHLETE_ID;
    fs.rmSync(path.join(dir, "owner.json"), { force: true });
    expect(owner.ownerId()).toBeNull();
    for (const anyone of [1, 2, null]) expect(canSeeAdmin(anyone)).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("OWNER_ATHLETE_ID"));

    process.env.OWNER_ATHLETE_ID = "not-a-number";
    expect(owner.ownerId()).toBeNull(); // ignored, still fail closed
    process.env.OWNER_ATHLETE_ID = "2";
    expect(owner.ownerId()).toBe(2);
    expect(canSeeAdmin(2)).toBe(true);
    expect(canSeeAdmin(1)).toBe(false);
    delete process.env.OWNER_ATHLETE_ID;
    warn.mockRestore();
  });

  test("a server already claimed before the setting keeps its owner until OWNER_ATHLETE_ID says otherwise", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fs.writeFileSync(path.join(dir, "owner.json"), JSON.stringify({ athleteId: 1 }));
    expect(owner.ownerId()).toBe(1);
    process.env.OWNER_ATHLETE_ID = "2";
    expect(owner.ownerId()).toBe(2); // the setting wins
    delete process.env.OWNER_ATHLETE_ID;
    fs.rmSync(path.join(dir, "owner.json"), { force: true });
    vi.restoreAllMocks();
  });

  test("a backup holds one athlete's files and can't be restored into another's", () => {
    const files = store.runAsAthlete(2, () => Object.keys(backup.createBackup().files));
    expect(files).toContain("settings.json");
    expect(files.some((f) => f.includes("athletes"))).toBe(false);
    expect(backup.isSafePath("athletes/1/settings.json")).toBe(false);
  });

  test("each athlete accepts the current terms for themselves", async () => {
    const { acceptTerms, hasAcceptedTerms } = await import("@/lib/legal/acceptance");
    expect(store.runAsAthlete(1, hasAcceptedTerms)).toBe(false);
    store.runAsAthlete(1, () => acceptTerms());
    expect(store.runAsAthlete(1, hasAcceptedTerms)).toBe(true);
    expect(store.runAsAthlete(2, hasAcceptedTerms)).toBe(false);
  });
});
