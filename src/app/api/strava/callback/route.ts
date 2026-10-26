import { NextResponse, type NextRequest } from "next/server";
import { athleteIds, claimOwner, moveSingleRiderData } from "@/lib/auth/owner";
import { authEnabled, createSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";
import { runAsAthlete } from "@/lib/data/store";
import { appUrl, exchangeCode, REQUIRED_SCOPES, saveTokens } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Strava redirects here after the rider approves (or declines) access. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const granted = (params.get("scope") ?? "").split(",");
  if (params.get("error") || !code) {
    return NextResponse.redirect(authEnabled() ? `${appUrl()}/login?error=declined` : `${appUrl()}/?strava=declined`);
  }
  const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
  if (missing.length) {
    return NextResponse.redirect(authEnabled() ? `${appUrl()}/login?error=missing-scope` : `${appUrl()}/?strava=missing-scope`);
  }
  const tokens = await exchangeCode(code, granted.join(","));
  const athleteId = tokens.athlete?.id;
  if (!authEnabled()) {
    saveTokens(tokens);
    return NextResponse.redirect(`${appUrl()}/?strava=connected`);
  }
  // Hosted: any Strava athlete can sign in and gets their own folder (up to MAX_ATHLETES, if set).
  if (!athleteId) return NextResponse.redirect(`${appUrl()}/login?error=declined`);
  const known = athleteIds();
  const limit = Number(process.env.MAX_ATHLETES) || Infinity;
  if (!known.includes(athleteId) && known.length >= limit) {
    return NextResponse.redirect(`${appUrl()}/login?error=full`);
  }
  if (claimOwner(athleteId) === athleteId) moveSingleRiderData(athleteId);
  runAsAthlete(athleteId, () => saveTokens(tokens));
  const res = NextResponse.redirect(`${appUrl()}/?strava=connected`);
  res.cookies.set(SESSION_COOKIE, await createSession(athleteId), {
    httpOnly: true,
    secure: appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
