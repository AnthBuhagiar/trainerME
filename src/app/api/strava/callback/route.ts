import { NextResponse, type NextRequest } from "next/server";
import { claimOrCheckOwner } from "@/lib/auth/owner";
import { authEnabled, createSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";
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
    return NextResponse.redirect(`${appUrl()}/?strava=missing-scope`);
  }
  const tokens = await exchangeCode(code, granted.join(","));
  const athleteId = tokens.athlete?.id;
  // On a hosted copy, only the owner's Strava account may sign in (and its tokens are never replaced by anyone else's).
  if (authEnabled() && (!athleteId || !claimOrCheckOwner(athleteId))) {
    return NextResponse.redirect(`${appUrl()}/login?error=not-owner`);
  }
  saveTokens(tokens);
  const res = NextResponse.redirect(`${appUrl()}/?strava=connected`);
  if (authEnabled() && athleteId) {
    res.cookies.set(SESSION_COOKIE, await createSession(athleteId), {
      httpOnly: true,
      secure: appUrl().startsWith("https://"),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    });
  }
  return res;
}
