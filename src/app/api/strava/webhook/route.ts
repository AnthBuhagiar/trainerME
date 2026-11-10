import { NextResponse, type NextRequest } from "next/server";
import { athleteIds } from "@/lib/auth/owner";
import { GRACE_DAYS, markStravaRevoked, purgeDueRevocations, stravaRevocation } from "@/lib/auth/revocation";
import { runAsAthlete } from "@/lib/data/store";
import { audit } from "@/lib/security/audit";
import { allow, clientKey } from "@/lib/security/rateLimit";
import { stravaAccess } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Strava checks the subscription once: echo its challenge if the verify token matches. */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = process.env.STRAVA_WEBHOOK_TOKEN;
  if (!token || p.get("hub.mode") !== "subscribe" || p.get("hub.verify_token") !== token) {
    return NextResponse.json({ error: "Not subscribed." }, { status: 403 });
  }
  return NextResponse.json({ "hub.challenge": p.get("hub.challenge") });
}

interface StravaEvent {
  object_type: "activity" | "athlete";
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id?: number;
  updates?: Record<string, string>;
}

/**
 * An athlete removed Hour Power in Strava. Events aren't signed, so the event
 * itself decides nothing: Strava is asked whether the saved tokens still work.
 * Only a refusal from Strava marks the rider revoked (sync stops, Today says
 * so, signing in again undoes it); their data is deleted after the grace
 * period, re-checked then (src/lib/auth/revocation.ts). A rate limit, outage
 * or network error changes nothing. Repeat events are harmless. Every decision
 * goes in the audit log. New rides are picked up by the next sync.
 */
export async function POST(req: NextRequest) {
  if (!allow(`strava-webhook:${clientKey(req)}`, 120, 60_000)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const event = (await req.json().catch(() => null)) as StravaEvent | null;
  const subscription = process.env.STRAVA_SUBSCRIPTION_ID;
  if (subscription && String(event?.subscription_id) !== subscription) return NextResponse.json({ ok: true }); // not our subscription
  const id = Number(event?.owner_id);
  if (event?.object_type === "athlete" && event.updates?.authorized === "false") {
    if (!athleteIds().includes(id)) {
      audit({ event: "strava-deauthorize", decision: "ignored: not a rider here" });
    } else {
      await runAsAthlete(id, async () => {
        if (stravaRevocation()) return audit({ event: "strava-deauthorize", athleteId: id, provider: "strava", decision: "already marked revoked" });
        const access = await stravaAccess();
        if (access === "ok") return audit({ event: "strava-deauthorize", athleteId: id, provider: "strava", decision: "ignored: Strava still accepts the tokens" });
        if (access === "unavailable") return audit({ event: "strava-deauthorize", athleteId: id, provider: "strava", decision: "not marked: Strava unavailable" });
        markStravaRevoked();
        audit({ event: "strava-deauthorize", athleteId: id, provider: "strava", decision: `marked revoked; data deleted after ${GRACE_DAYS} days unless they sign in again` });
      });
    }
  }
  // Riders whose grace period has passed (re-checked with Strava first). Not awaited: Strava wants a quick reply.
  void purgeDueRevocations(stravaAccess).catch(() => {});
  return NextResponse.json({ ok: true }); // Strava expects a quick 200 either way
}
