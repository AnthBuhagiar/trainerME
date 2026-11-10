import { NextResponse, type NextRequest } from "next/server";
import { athleteIds, claimOwner, moveSingleRiderData } from "@/lib/auth/owner";
import { authEnabled, createSession, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth/session";
import { runAsAthlete } from "@/lib/data/store";
import { acceptTerms } from "@/lib/legal/acceptance";
import { TERMS_COOKIE, TERMS_VERSION } from "@/lib/legal/terms";
import { ensureReferralCode, recordReferrer, REFERRAL_COOKIE } from "@/lib/referral/referral";
import { syncStrava } from "@/lib/strava/sync";
import { appUrl, exchangeCode, NEXT_COOKIE, REQUIRED_SCOPES, safeNext, saveTokens, STATE_COOKIE } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Strava redirects here after the rider approves (or declines) access. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const granted = (params.get("scope") ?? "").split(",");
  // Only finish a sign-in this browser started (stops a link signing someone into another account).
  const state = req.cookies.get(STATE_COOKIE)?.value;
  if (!state || params.get("state") !== state) {
    return NextResponse.redirect(authEnabled() ? `${appUrl()}/login?error=expired` : `${appUrl()}/?strava=expired`);
  }
  if (params.get("error") || !code) {
    return NextResponse.redirect(authEnabled() ? `${appUrl()}/login?error=declined` : `${appUrl()}/?strava=declined`);
  }
  const missing = REQUIRED_SCOPES.filter((s) => !granted.includes(s));
  if (missing.length) {
    return NextResponse.redirect(authEnabled() ? `${appUrl()}/login?error=missing-scope` : `${appUrl()}/?strava=missing-scope`);
  }
  const tokens = await exchangeCode(code, granted.join(","));
  // Back where the rider was (a finished ride waiting to upload), else Today.
  const next = safeNext(req.cookies.get(NEXT_COOKIE)?.value);
  const done = (fallback: string) => {
    const r = NextResponse.redirect(next ? `${appUrl()}${next}` : fallback);
    r.cookies.delete(NEXT_COOKIE);
    r.cookies.delete(STATE_COOKIE);
    return r;
  };
  const athleteId = tokens.athlete?.id;
  if (!authEnabled()) {
    saveTokens(tokens);
    return done(`${appUrl()}/?strava=connected`);
  }
  // Hosted: any Strava athlete can sign in and gets their own folder (up to MAX_ATHLETES, if set).
  if (!athleteId) return NextResponse.redirect(`${appUrl()}/login?error=declined`);
  const known = athleteIds();
  const limit = Number(process.env.MAX_ATHLETES) || Infinity;
  if (!known.includes(athleteId) && known.length >= limit) {
    return NextResponse.redirect(`${appUrl()}/login?error=full`);
  }
  if (claimOwner(athleteId) === athleteId) moveSingleRiderData(athleteId);
  const agreed = req.cookies.get(TERMS_COOKIE)?.value === TERMS_VERSION;
  runAsAthlete(athleteId, () => {
    saveTokens(tokens);
    if (agreed) acceptTerms(); // ticked on the sign-in page; otherwise they're asked before anything else
  });
  ensureReferralCode(athleteId);
  // A recommender's code counts only for a rider joining now, not one signing in again.
  const ref = req.cookies.get(REFERRAL_COOKIE)?.value;
  if (ref && !known.includes(athleteId)) recordReferrer(athleteId, ref);
  // A new rider goes to set their goal first: start pulling their rides meanwhile, so Today is ready after.
  if (!known.includes(athleteId)) void runAsAthlete(athleteId, () => syncStrava()).catch(() => {});
  const res = done(`${appUrl()}/?strava=connected`);
  res.cookies.delete(TERMS_COOKIE);
  res.cookies.delete(REFERRAL_COOKIE);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.set(SESSION_COOKIE, await createSession(athleteId), {
    httpOnly: true,
    secure: appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
