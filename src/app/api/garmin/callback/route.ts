import { NextResponse, type NextRequest } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { canSendWorkouts, exchangeCode, GARMIN_NEXT_COOKIE, GARMIN_STATE_COOKIE, GARMIN_VERIFIER_COOKIE, saveGarminTokens } from "@/lib/garmin/client";
import { appUrl, safeNext } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Garmin sends the rider back here after they approve (or decline) Hour Power. */
async function get(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const settings = (status: string) => `${appUrl()}/settings?garmin=${status}#garmin`;
  const finish = (url: string) => {
    const res = NextResponse.redirect(url);
    for (const c of [GARMIN_STATE_COOKIE, GARMIN_VERIFIER_COOKIE, GARMIN_NEXT_COOKIE]) res.cookies.delete(c);
    return res;
  };
  const state = req.cookies.get(GARMIN_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(GARMIN_VERIFIER_COOKIE)?.value;
  if (!state || !verifier || params.get("state") !== state) return finish(settings("expired"));
  const code = params.get("code");
  if (params.get("error") || !code) return finish(settings("declined"));
  try {
    const tokens = await exchangeCode(code, verifier);
    saveGarminTokens(tokens);
    if (!canSendWorkouts(tokens)) return finish(settings("no-workouts"));
  } catch {
    return finish(settings("failed"));
  }
  const next = safeNext(req.cookies.get(GARMIN_NEXT_COOKIE)?.value);
  return finish(next ? `${appUrl()}${next}` : settings("connected"));
}

export const GET = athleteRoute(get);
