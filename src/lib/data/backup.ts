import fs from "node:fs";
import path from "node:path";
import { dataDir, FILE_MODE, privateDir } from "@/lib/data/store";

/**
 * Everything in data/ except credentials, as one JSON file, so the app can
 * move between the codespace and a hosted copy. Strava tokens and the owner
 * record stay behind: the new copy signs in to Strava itself.
 */

// Credentials (Strava and Garmin tokens, the watch's key) never go in a backup or come back from one.
// referral.json: who recommended whom and who has paid is the server's record, never restored from a file.
const EXCLUDE = new Set([
  "strava-tokens.json",
  "garmin-tokens.json",
  "watch.json",
  "owner.json",
  "intervals.json",
  "referral.json",
  "referral-codes.json",
]);

export interface Backup {
  app: "hour-power";
  version: 1;
  createdAt: string;
  files: Record<string, unknown>;
}

function walk(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const rel = path.posix.join(base, e.name);
    // athletes/ only exists at the top of a shared server; never part of one rider's backup.
    if (e.isDirectory()) return rel === "athletes" ? [] : walk(path.join(dir, e.name), rel);
    return e.name.endsWith(".json") && !EXCLUDE.has(rel) ? [rel] : [];
  });
}

export function createBackup(): Backup {
  const files: Record<string, unknown> = {};
  const dir = dataDir();
  for (const rel of walk(dir)) {
    try {
      files[rel] = JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
    } catch {
      // skip unreadable files
    }
  }
  return { app: "hour-power", version: 1, createdAt: new Date().toISOString(), files };
}

/** Safe relative paths only: no "..", no absolute paths, JSON files, never credentials. */
export function isSafePath(rel: string): boolean {
  return /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_.-]+)*\.json$/.test(rel) && !rel.split("/").includes("..") && !EXCLUDE.has(rel) && !rel.startsWith("athletes/");
}

export function restoreBackup(backup: Backup): number {
  if (backup?.app !== "hour-power" || backup.version !== 1 || typeof backup.files !== "object") throw new Error("That isn't an Hour Power backup file.");
  let n = 0;
  for (const [rel, value] of Object.entries(backup.files)) {
    if (!isSafePath(rel)) continue;
    const target = path.join(dataDir(), rel);
    privateDir(path.dirname(target));
    fs.writeFileSync(target, JSON.stringify(value, null, 2), { mode: FILE_MODE });
    n++;
  }
  return n;
}
