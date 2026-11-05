import { NextResponse, type NextRequest } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { authorizeUrl, GARMIN_NEXT_COOKIE, GARMIN_STATE_COOKIE, GARMIN_VERIFIER_COOKIE, hasGarminCredentials, pkce } from "@/lib/garmin/client";
import { appUrl, safeNext } from "@/lib/strava/client";

export const runtime = "nodejs";

/**
 * Sends the rider to Garmin to approve Hour Power. The random state and the
 * PKCE verifier stay in short-lived cookies only this browser holds, so the
 * callback finishes only a connection this browser started.
 */
function get(req: NextRequest) {
  if (!hasGarminCredentials()) return NextResponse.redirect(`${appUrl()}/settings?garmin=no-credentials#garmin`);
  const state = crypto.randomUUID();
  const { verifier, challenge } = pkce();
  const res = NextResponse.redirect(authorizeUrl(state, challenge));
  const opts = { httpOnly: true, secure: appUrl().startsWith("https://"), sameSite: "lax" as const, path: "/", maxAge: 30 * 60 };
  res.cookies.set(GARMIN_STATE_COOKIE, state, opts);
  res.cookies.set(GARMIN_VERIFIER_COOKIE, verifier, opts);
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (next) res.cookies.set(GARMIN_NEXT_COOKIE, next, opts);
  return res;
}

export const GET = athleteRoute(get);
