import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { disconnectGarmin } from "@/lib/garmin/client";
import { appUrl } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Remove Hour Power's access on Garmin and forget the tokens. Workouts already on the calendar stay there. */
async function post() {
  await disconnectGarmin();
  return NextResponse.redirect(`${appUrl()}/settings?garmin=disconnected#garmin`, 303);
}

export const POST = athleteRoute(post);
