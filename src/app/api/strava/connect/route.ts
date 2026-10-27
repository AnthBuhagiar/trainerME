import { NextResponse, type NextRequest } from "next/server";
import { TERMS_COOKIE } from "@/lib/legal/terms";
import { appUrl, authorizeUrl, hasCredentials } from "@/lib/strava/client";

export const runtime = "nodejs";

/**
 * Sends the rider to Strava to approve read access. From the sign-in page it
 * carries the terms version they ticked, kept in a short-lived cookie so the
 * callback can record it once Strava says who they are.
 */
export function GET(req: NextRequest) {
  if (!hasCredentials()) return NextResponse.redirect(`${appUrl()}/?strava=no-credentials`);
  const res = NextResponse.redirect(authorizeUrl());
  const agreed = req.nextUrl.searchParams.get("agree");
  if (agreed) {
    res.cookies.set(TERMS_COOKIE, agreed, { httpOnly: true, secure: appUrl().startsWith("https://"), sameSite: "lax", path: "/", maxAge: 30 * 60 });
  }
  return res;
}
