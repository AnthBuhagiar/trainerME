import fs from "node:fs";
import path from "node:path";
import { athleteDir, DATA_DIR, readServerJson } from "@/lib/data/store";

const FILE = "owner.json";

/**
 * The server's owner runs it: they see the admin dashboard, the server's own
 * Intervals.icu key is theirs, and data from before it had more than one rider
 * moves into their folder. Set by OWNER_ATHLETE_ID (their Strava athlete id).
 *
 * Nobody becomes owner by signing in first. A server already claimed that way
 * (owner.json, from before this setting) keeps that owner until
 * OWNER_ATHLETE_ID is set, which then wins. With neither, there is no owner:
 * the admin dashboard and owner-only features are off (fail closed), and the
 * server logs how to set one up.
 */
export function ownerId(): number | null {
  const configured = configuredOwner();
  if (configured !== null) return configured;
  const legacy = readServerJson<{ athleteId?: number }>(FILE, {}).athleteId;
  if (typeof legacy === "number" && Number.isSafeInteger(legacy) && legacy > 0) {
    warnOnce(`Hour Power: the owner comes from owner.json (athlete ${legacy}). Set OWNER_ATHLETE_ID=${legacy} to make it explicit.`);
    return legacy;
  }
  warnOnce("Hour Power: no owner set, so the admin dashboard and owner-only features are off. Set OWNER_ATHLETE_ID to the owner's Strava athlete id.");
  return null;
}

/** OWNER_ATHLETE_ID, if it's a valid athlete id. */
function configuredOwner(): number | null {
  const raw = process.env.OWNER_ATHLETE_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  if (Number.isSafeInteger(id) && id > 0) return id;
  warnOnce("Hour Power: OWNER_ATHLETE_ID isn't a Strava athlete id (a whole number), so it's ignored.");
  return null;
}

const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message) || !process.env.SESSION_SECRET) return; // only hosted copies have an owner to set up
  warned.add(message);
  console.warn(message);
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

// Server-wide records stay at the top (referral-codes.json: every rider's code).
const KEEP_AT_TOP = new Set([FILE, "athletes", "referral-codes.json"]);
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
