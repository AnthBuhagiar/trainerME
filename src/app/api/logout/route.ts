import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { appUrl } from "@/lib/strava/client";

export function POST() {
  const res = NextResponse.redirect(`${appUrl()}/login`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
