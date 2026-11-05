import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { createWatchKey, revokeWatchKey } from "@/lib/watch/key";

/** POST: a new watch key (shown once, replaces the old one). DELETE: turn the watch off. */
export const POST = athleteRoute(async () => NextResponse.json({ key: createWatchKey(multiUser() ? currentAthlete() : null) }));

export const DELETE = athleteRoute(async () => {
  revokeWatchKey();
  return NextResponse.json({ ok: true });
});
