import fs from "node:fs";
import path from "node:path";
import { athleteDir, DATA_DIR, readServerJson, writeServerJson } from "@/lib/data/store";

const FILE = "owner.json";

/**
 * The first Strava athlete to sign in to a hosted copy runs it: the server's
 * own Intervals.icu key is theirs, and data from before it had more than one
 * rider moves into their folder.
 */
export function ownerId(): number | null {
  return readServerJson<{ athleteId?: number }>(FILE, {}).athleteId ?? null;
}

export function claimOwner(athleteId: number): number {
  const owner = ownerId();
  if (owner !== null) return owner;
  writeServerJson(FILE, { athleteId });
  return athleteId;
}

/** Everyone who has signed in, from their folders. */
export function athleteIds(): number[] {
  try {
    return fs
      .readdirSync(path.join(DATA_DIR, "athletes"))
      .filter((n) => /^\d+$/.test(n))
      .map(Number);
  } catch {
    return [];
  }
}

const KEEP_AT_TOP = new Set([FILE, "athletes"]);
let migrated = false;

/**
 * Data saved before the app had per-athlete folders sits at the top of data/.
 * It belongs to the owner: move it into their folder once, never overwriting.
 */
export function moveSingleRiderData(owner = ownerId()): number {
  if (migrated || owner === null) return 0;
  const target = athleteDir(owner);
  let moved = 0;
  for (const name of fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : []) {
    if (KEEP_AT_TOP.has(name) || name.startsWith(".")) continue;
    const to = path.join(target, name);
    if (fs.existsSync(to)) continue;
    fs.mkdirSync(target, { recursive: true });
    fs.renameSync(path.join(DATA_DIR, name), to);
    moved++;
  }
  migrated = true;
  return moved;
}
