import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Sends the rider to Strava to approve read access. */
export function GET() {
  return NextResponse.redirect(authorizeUrl());
}
