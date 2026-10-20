import { NextResponse } from "next/server";
import { appUrl, authorizeUrl, hasCredentials } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Sends the rider to Strava to approve read access. */
export function GET() {
  if (!hasCredentials()) return NextResponse.redirect(`${appUrl()}/?strava=no-credentials`);
  return NextResponse.redirect(authorizeUrl());
}
