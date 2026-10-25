import { NextResponse } from "next/server";
import { syncIntervals } from "@/lib/intervals/sync";
import { loadTokens } from "@/lib/strava/client";
import { syncStrava } from "@/lib/strava/sync";

export const runtime = "nodejs";

/** Pulls new activities and a batch of ride streams from Strava, then from Intervals.icu if its key is set. */
export async function POST() {
  try {
    const strava = loadTokens() ? await syncStrava() : null;
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
