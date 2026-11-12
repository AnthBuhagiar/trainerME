import { athleteRoute } from "@/lib/auth/athlete";
import { stravaRevocation } from "@/lib/auth/revocation";
import { NextResponse } from "next/server";
import { syncIntervals } from "@/lib/intervals/sync";
import { loadTokens } from "@/lib/strava/client";
import { brandGarminRides } from "@/lib/strava/brand";
import { syncStrava } from "@/lib/strava/sync";
import { syncsGarmin } from "@/lib/garmin/resync";

export const runtime = "nodejs";

/** Pulls new activities and a batch of ride streams from Strava, then from Intervals.icu if its key is set. */
async function post() {
  // Removed in Strava: stop until they connect again (Today says so).
  if (stravaRevocation()) return NextResponse.json({ error: "Hour Power's access to Strava was removed. Connect Strava again to carry on." }, { status: 409 });
  try {
    const strava = loadTokens() ? await syncStrava() : null;
    // Hour Power workouts ridden on Garmin: say so on Strava (a few per sync, never in the way).
    if (strava && !strava.rateLimited) await brandGarminRides();
    let intervals = null;
    let intervalsError: string | undefined;
    try {
      intervals = await syncIntervals();
    } catch (err) {
      // A problem with the second source shouldn't hide a good Strava sync.
      intervalsError = `Intervals.icu: ${(err as Error).message}`;
    }
    return NextResponse.json({
      newActivities: (strava?.newActivities ?? 0) + (intervals?.newActivities ?? 0),
      totalActivities: strava?.totalActivities ?? 0,
      streamsFetched: (strava?.streamsFetched ?? 0) + (intervals?.streamsFetched ?? 0),
      ridesMissingStreams: strava?.ridesMissingStreams ?? 0,
      rateLimited: strava?.rateLimited ?? false,
      sources: [strava && "Strava", intervals && "Intervals.icu"].filter(Boolean),
      intervalsError,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export const POST = athleteRoute(syncsGarmin(post));
