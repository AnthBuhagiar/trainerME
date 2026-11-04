import { athleteRoute } from "@/lib/auth/athlete";
import { NextResponse } from "next/server";
import { keepRide } from "@/lib/player/keepRide";
import { canUpload, stravaUpload } from "@/lib/strava/client";
import { buildTcx, type RideSample } from "@/lib/strava/tcx";

export const runtime = "nodejs";

interface Body {
  name: string;
  startMs: number;
  samples: RideSample[];
}

/** Keep a ride recorded in the player in Hour Power, then upload it to Strava. */
async function post(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.samples?.length || !Number.isFinite(body.startMs)) return NextResponse.json({ error: "Nothing recorded yet." }, { status: 400 });
  // First, so the ride counts in Hour Power even when Strava says no.
  let kept = false;
  try {
    keepRide(body.name, body.startMs, body.samples);
    kept = true;
  } catch {
    // Never let this stop the upload.
  }
  if (!canUpload()) {
    return NextResponse.json({ kept, error: "Strava needs permission to upload: reconnect and tick “Upload your activities”.", reconnect: true }, { status: 403 });
  }
  try {
    const result = await stravaUpload(buildTcx(body.startMs, body.samples, "Ridden with Hour Power"), {
      name: body.name,
      description: "Ridden with Hour Power",
      externalId: `hourpower-${body.startMs}`,
    });
    return NextResponse.json({ kept, ...result }, { status: result.error ? 422 : 200 });
  } catch (e) {
    const message = (e as Error).message;
    return NextResponse.json({ kept, error: message, reconnect: /reconnect/i.test(message) }, { status: 502 });
  }
}

export const POST = athleteRoute(post);
