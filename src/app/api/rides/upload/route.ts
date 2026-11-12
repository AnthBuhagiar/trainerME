import { athleteRoute } from "@/lib/auth/athlete";
import { badBody, rateLimited, readJsonBody } from "@/lib/security/requests";
import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/data/store";
import { physicsFor } from "@/lib/goals/summary";
import { keepRide } from "@/lib/player/keepRide";
import { virtualSpeed } from "@/lib/player/virtualSpeed";
import { markRidden } from "@/lib/plan/completions";
import { setRiderTimeZone } from "@/lib/plan/timeZone";
import { brandLine, brandOn } from "@/lib/strava/brandLine";
import { canUpload, stravaUpload } from "@/lib/strava/client";
import { buildTcx, type RideSample } from "@/lib/strava/tcx";

export const runtime = "nodejs";

interface Body {
  name: string;
  startMs: number;
  samples: RideSample[];
  /** The planned session this ride was (it may have been ridden on another day). */
  planned?: { date?: unknown; start?: unknown };
  /** The phone's time zone, so the ride is kept at the time it was ridden. */
  timeZone?: unknown;
}

/** Keep a ride recorded in the player in Hour Power, then upload it to Strava. */
/** A ride in the player records one sample a second: 12 hours is plenty, and well under the size cap. */
const MAX_SAMPLES = 12 * 3600;
const MAX_BYTES = 8 * 1024 * 1024;

async function post(request: Request) {
  const limited = rateLimited("ride-upload", request, 10, 60_000);
  if (limited) return limited;
  let body: Body;
  try {
    body = await readJsonBody<Body>(request, MAX_BYTES);
  } catch (e) {
    return badBody(e);
  }
  if (!Array.isArray(body?.samples) || body.samples.length > MAX_SAMPLES || !body.samples.every((x) => x && Number.isFinite(x.t))) {
    return NextResponse.json({ error: body?.samples?.length > MAX_SAMPLES ? "That ride is longer than 12 hours." : "Nothing recorded yet." }, { status: body?.samples?.length > MAX_SAMPLES ? 413 : 400 });
  }
  if (!body.samples?.length || !Number.isFinite(body.startMs)) return NextResponse.json({ error: "Nothing recorded yet." }, { status: 400 });
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 120) return NextResponse.json({ error: "That ride needs a name." }, { status: 400 });
  // First, so the ride counts in Hour Power even when Strava says no.
  let kept = false;
  try {
    setRiderTimeZone(body.timeZone);
    const ride = keepRide(body.name, body.startMs, body.samples);
    kept = true;
    const { date, start } = body.planned ?? {};
    if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof start === "string" && /^\d{2}:\d{2}$/.test(start)) {
      markRidden(date, start, ride.start_local); // done, whatever the ride ends up called
    }
  } catch {
    // Never let this stop the upload.
  }
  if (!canUpload()) {
    return NextResponse.json({ kept, error: "Strava needs permission to upload: reconnect and tick “Upload your activities”.", reconnect: true }, { status: 403 });
  }
  try {
    const result = await stravaUpload(buildTcx(body.startMs, body.samples, "Ridden with Hour Power", virtualSpeed(body.samples, physicsFor(loadSettings())).map((m) => m.distance)), {
      name: body.name,
      description: brandOn(loadSettings()) ? brandLine(body.name) : undefined,
      externalId: `hourpower-${body.startMs}`,
    });
    return NextResponse.json({ kept, ...result }, { status: result.error ? 422 : 200 });
  } catch (e) {
    const message = (e as Error).message;
    return NextResponse.json({ kept, error: message, reconnect: /reconnect/i.test(message) }, { status: 502 });
  }
}

export const POST = athleteRoute(post);
