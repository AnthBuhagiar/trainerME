import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { garminConnected } from "@/lib/garmin/client";
import { sendToGarmin, upcomingRides } from "@/lib/garmin/send";
import { loadState } from "@/lib/plan/current";
import { resolveSession } from "@/lib/plan/session";

export const runtime = "nodejs";

/**
 * POST /api/garmin/send                                   the rest of this week and next week
 * POST /api/garmin/send {date, start, minutes?}           one session (at the length chosen)
 */
async function post(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: string; start?: string; minutes?: string };
  try {
    if (!garminConnected()) return NextResponse.json({ error: "Connect Garmin first." }, { status: 400 });
    if (body.date) {
      const found = resolveSession(body.date, body.start, body.minutes);
      if (!found?.session.ride) return NextResponse.json({ error: "No ride that day." }, { status: 404 });
      if (!found.hourPower) return NextResponse.json({ error: "Sync your rides first so targets can be set." }, { status: 400 });
      return NextResponse.json(await sendToGarmin([found.session], found.hourPower, undefined, found.planned));
    }
    const state = loadState();
    if (!state.current) return NextResponse.json({ error: "Sync Strava first so targets can be set from your hour power." }, { status: 400 });
    const { sessions, oldest, newest } = upcomingRides(state);
    return NextResponse.json(await sendToGarmin(sessions, state.targets!.training, { oldest, newest }));
  } catch (e) {
    console.error("Garmin send failed:", e); // in the server log (journalctl -u hour-power)
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export const POST = athleteRoute(post);
