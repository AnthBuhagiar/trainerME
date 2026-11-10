import { NextResponse, type NextRequest } from "next/server";
import { athleteIds } from "@/lib/auth/owner";
import { currentAthlete, multiUser, runAsAthlete } from "@/lib/data/store";
import crypto from "node:crypto";
import { forgetGarmin, garminAccess, loadGarminTokens, permissionList, saveGarminTokens } from "@/lib/garmin/client";
import { audit } from "@/lib/security/audit";
import { allow, clientKey } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

interface GarminPing {
  deregistrations?: { userId?: string }[];
  userPermissionsChange?: { userId?: string; permissions?: unknown }[];
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

/** The shared secret Garmin's push URL carries (?token=…, or the X-Webhook-Token header), compared in constant time. */
function genuine(req: NextRequest): boolean {
  const expected = process.env.GARMIN_WEBHOOK_TOKEN;
  const given = req.headers.get("x-webhook-token") ?? req.nextUrl.searchParams.get("token");
  if (!expected || expected.length < 16 || !given) return false; // not set up: refuse rather than run open
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Garmin's deregistration and permission-change notifications. Set both
 * endpoints in the developer portal to this address with
 * ?token=<GARMIN_WEBHOOK_TOKEN>; anything without the token is refused, and
 * calls are rate limited. Even then a removal is only acted on once Garmin
 * itself refuses the saved tokens (a Garmin outage changes nothing), and it
 * only forgets the Garmin connection. Every decision goes in the audit log.
 */
export async function POST(req: NextRequest) {
  if (!allow(`garmin-webhook:${clientKey(req)}`, 120, 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  if (!genuine(req)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const ping = (await req.json().catch(() => null)) as GarminPing | null;
  for (const d of ping?.deregistrations ?? []) {
    if (!d.userId) continue;
    await forGarminUser(d.userId, async () => {
      const access = await garminAccess();
      if (access === "revoked") forgetGarmin();
      audit({
        event: "garmin-deregistration",
        athleteId: currentAthlete() ?? undefined,
        provider: "garmin",
        decision: access === "revoked" ? "forgot the Garmin connection" : access === "ok" ? "ignored: Garmin still accepts the tokens" : "kept: Garmin unavailable",
      });
    });
  }
  for (const p of ping?.userPermissionsChange ?? []) {
    const permissions = permissionList(p.permissions);
    if (!p.userId || !permissions) continue;
    // Only a hint for the app's buttons: Garmin itself enforces what Hour Power may do.
    await forGarminUser(p.userId, async () => {
      const t = loadGarminTokens();
      if (t) saveGarminTokens({ ...t, permissions });
    });
  }
  return NextResponse.json({ ok: true }); // Garmin expects a quick 200 either way
}
