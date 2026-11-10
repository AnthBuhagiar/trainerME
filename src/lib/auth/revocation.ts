import fs from "node:fs";
import { athleteIds } from "@/lib/auth/owner";
import { athleteDir, readJson, runAsAthlete, writeJson } from "@/lib/data/store";
import { retireCode } from "@/lib/referral/referral";
import { audit } from "@/lib/security/audit";

/**
 * A rider who removed Hour Power in Strava (confirmed with Strava, not just
 * reported by an unsigned webhook) is marked revoked, not erased: sync stops,
 * Today tells them, and signing in again undoes it. Their data is deleted only
 * after GRACE_DAYS, and only if Strava still refuses the connection then.
 */

export const GRACE_DAYS = 7;
const FILE = "revoked.json";

export interface Revocation {
  revokedAt: string;
  purgeAfter: string;
}

/** This request's rider's Strava revocation, if any. */
export function stravaRevocation(): Revocation | null {
  return readJson<Revocation | null>(FILE, null);
}

/** Mark this request's rider revoked; a repeat keeps the first date (idempotent). Returns whether it was new. */
export function markStravaRevoked(now = new Date()): boolean {
  if (stravaRevocation()) return false;
  writeJson(FILE, { revokedAt: now.toISOString(), purgeAfter: new Date(now.getTime() + GRACE_DAYS * 86_400_000).toISOString() });
  return true;
}

/** Signed in again: the connection is back, nothing will be deleted. */
export function clearStravaRevocation(): boolean {
  if (!stravaRevocation()) return false;
  writeJson(FILE, null);
  return true;
}

/**
 * Delete riders whose grace period has passed, re-checking with Strava first:
 * still revoked → purge; reachable again → clear; can't tell → try later.
 */
export async function purgeDueRevocations(check: () => Promise<"ok" | "revoked" | "unavailable">, now = new Date()): Promise<number[]> {
  const purged: number[] = [];
  for (const id of athleteIds()) {
    const due = runAsAthlete(id, () => {
      const r = stravaRevocation();
      return r && Date.parse(r.purgeAfter) <= now.getTime();
    });
    if (!due) continue;
    const access = await runAsAthlete(id, check);
    if (access === "ok") {
      runAsAthlete(id, clearStravaRevocation);
      audit({ event: "purge-check", athleteId: id, provider: "strava", decision: "kept: access is back" }, now);
    } else if (access === "unavailable") {
      audit({ event: "purge-check", athleteId: id, provider: "strava", decision: "postponed: Strava unavailable" }, now);
    } else {
      retireCode(id);
      fs.rmSync(athleteDir(id), { recursive: true, force: true });
      audit({ event: "purge", athleteId: id, provider: "strava", decision: `deleted after ${GRACE_DAYS} days revoked` }, now);
      purged.push(id);
    }
  }
  return purged;
}
