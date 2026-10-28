import { NextResponse, type NextRequest } from "next/server";
import { TERMS_COOKIE } from "@/lib/legal/terms";
import { normalizeCode, ownerOfCode, REFERRAL_COOKIE } from "@/lib/referral/referral";
import { appUrl, authorizeUrl, hasCredentials } from "@/lib/strava/client";

export const runtime = "nodejs";

/**
 * Sends the rider to Strava to approve read access. From the sign-in page it
 * carries the terms version they ticked, kept in a short-lived cookie so the
 * callback can record it once Strava says who they are. A recommender's code
 * travels the same way.
 */
export function GET(req: NextRequest) {
  if (!hasCredentials()) return NextResponse.redirect(`${appUrl()}/?strava=no-credentials`);
  // A recommender's code (optional): check it here, so a typo is caught before the Strava round trip.
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  const code = ref ? normalizeCode(ref) : null;
  if (ref && (!code || ownerOfCode(code) === null)) {
    return NextResponse.redirect(`${appUrl()}/login?error=code&ref=${encodeURIComponent(ref.slice(0, 8))}`);
  }
  const res = NextResponse.redirect(authorizeUrl());
  if (code) {
    res.cookies.set(REFERRAL_COOKIE, code, { httpOnly: true, secure: appUrl().startsWith("https://"), sameSite: "lax", path: "/", maxAge: 30 * 60 });
  }
  const agreed = req.nextUrl.searchParams.get("agree");
  if (agreed) {
    res.cookies.set(TERMS_COOKIE, agreed, { httpOnly: true, secure: appUrl().startsWith("https://"), sameSite: "lax", path: "/", maxAge: 30 * 60 });
  }
  return res;
}
