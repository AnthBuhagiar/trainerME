import fs from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { athleteIds } from "@/lib/auth/owner";
import { dataDir, runAsAthlete } from "@/lib/data/store";
import { retireCode } from "@/lib/referral/referral";
import { stillAuthorized } from "@/lib/strava/client";

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
  updates?: Record<string, string>;
}

/**
 * An athlete removed Hour Power in Strava: delete everything held for them.
 * Events aren't signed, so first confirm with Strava that access really is gone.
 * New rides are picked up by the next sync, when the rider opens the app.
 */
export async function POST(req: NextRequest) {
  const event = (await req.json().catch(() => null)) as StravaEvent | null;
  const id = Number(event?.owner_id);
  if (event?.object_type === "athlete" && event.updates?.authorized === "false" && athleteIds().includes(id)) {
    await runAsAthlete(id, async () => {
      if (!(await stillAuthorized())) {
        retireCode(id);
        fs.rmSync(dataDir(), { recursive: true, force: true });
      }
    });
  }
  return NextResponse.json({ ok: true }); // Strava expects a quick 200 either way
}
