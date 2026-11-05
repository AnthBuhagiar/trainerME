import { NextResponse, type NextRequest } from "next/server";
import { athleteIds } from "@/lib/auth/owner";
import { multiUser, runAsAthlete } from "@/lib/data/store";
import { forgetGarmin, loadGarminTokens, saveGarminTokens, stillConnected } from "@/lib/garmin/client";

export const runtime = "nodejs";

interface GarminPing {
  deregistrations?: { userId?: string }[];
  userPermissionsChange?: { userId?: string; permissions?: string[] }[];
}

/** Run `fn` as each athlete whose saved Garmin connection belongs to this Garmin user. */
async function forGarminUser(userId: string, fn: () => Promise<void>): Promise<void> {
  const match = () => loadGarminTokens()?.userId === userId;
  if (!multiUser()) {
    if (match()) await fn();
    return;
  }
  for (const id of athleteIds()) await runAsAthlete(id, async () => (match() ? fn() : undefined));
}

/**
 * Garmin's deregistration and permission-change notifications (set both
 * endpoints to this address in the developer portal). They aren't signed, so a
 * removal is only acted on once Garmin really refuses the saved tokens.
 */
export async function POST(req: NextRequest) {
  const ping = (await req.json().catch(() => null)) as GarminPing | null;
  for (const d of ping?.deregistrations ?? []) {
    if (d.userId) await forGarminUser(d.userId, async () => (!(await stillConnected()) ? forgetGarmin() : undefined));
  }
  for (const p of ping?.userPermissionsChange ?? []) {
    if (!p.userId || !Array.isArray(p.permissions)) continue;
    const permissions = p.permissions.filter((x): x is string => typeof x === "string");
    // Only a hint for the app's buttons: Garmin itself enforces what Hour Power may do.
    await forGarminUser(p.userId, async () => {
      const t = loadGarminTokens();
      if (t) saveGarminTokens({ ...t, permissions });
    });
  }
  return NextResponse.json({ ok: true }); // Garmin expects a quick 200 either way
}
