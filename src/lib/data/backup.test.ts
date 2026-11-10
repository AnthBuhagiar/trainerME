import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-backup-"));
process.env.TRAINERME_DATA_DIR = dir;
const { createBackup, isSafePath, restoreBackup } = await import("@/lib/data/backup");
const { writeJson, readJson } = await import("@/lib/data/store");

describe("backup", () => {
  test("includes data but never credentials", () => {
    writeJson("goals.json", [{ id: "g" }]);
    writeJson("routes/g.json", { name: "r" });
    writeJson("strava-tokens.json", { access_token: "secret" });
    const b = createBackup();
    expect(Object.keys(b.files).sort()).toEqual(["goals.json", "routes/g.json"]);
  });

  test("carries no token material at all: Strava, Garmin or the watch key", () => {
    writeJson("strava-tokens.json", { access_token: "AT-strava-synthetic", refresh_token: "RT-strava-synthetic" });
    writeJson("garmin-tokens.json", { access_token: "AT-garmin-synthetic", refresh_token: "RT-garmin-synthetic" });
    writeJson("watch.json", { hash: "watch-hash-synthetic" });
    const text = JSON.stringify(createBackup());
    for (const secret of ["AT-strava", "RT-strava", "AT-garmin", "RT-garmin", "watch-hash", "access_token", "refresh_token"]) expect(text).not.toContain(secret);
    for (const f of ["strava-tokens.json", "garmin-tokens.json", "watch.json"]) expect(isSafePath(f)).toBe(false); // never restored either
  });

    test("restores files and refuses unsafe paths", () => {
    const n = restoreBackup({
      app: "hour-power",
      version: 1,
      createdAt: "",
      files: { "away.json": [{ id: "a" }], "../evil.json": {}, "strava-tokens.json": {}, "/etc/x.json": {} },
    });
    expect(n).toBe(1);
    expect(readJson("away.json", [])).toEqual([{ id: "a" }]);
    expect(fs.existsSync(path.join(dir, "..", "evil.json"))).toBe(false);
    expect(isSafePath("routes/../../x.json")).toBe(false);
    expect(() => restoreBackup({} as never)).toThrow(/isn't an Hour Power backup/);
  });
});
