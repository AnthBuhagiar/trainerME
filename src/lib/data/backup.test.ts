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
