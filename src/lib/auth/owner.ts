import { readJson, writeJson } from "@/lib/data/store";

const FILE = "owner.json";

/** The Strava athlete who owns this copy of the app, if one has signed in. */
export function ownerId(): number | null {
  return readJson<{ athleteId?: number }>(FILE, {}).athleteId ?? null;
}

/** First sign-in claims the app; afterwards only the owner may sign in. */
export function claimOrCheckOwner(athleteId: number): boolean {
  const owner = ownerId();
  if (owner === null) {
    writeJson(FILE, { athleteId });
    return true;
  }
  return owner === athleteId;
}
