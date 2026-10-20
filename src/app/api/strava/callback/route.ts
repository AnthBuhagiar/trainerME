import { NextResponse, type NextRequest } from "next/server";
import { appUrl, exchangeCode, STRAVA_SCOPES } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Strava redirects here after the rider approves (or declines) access. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const granted = (params.get("scope") ?? "").split(",");
  if (params.get("error") || !code) {
    return NextResponse.redirect(`${appUrl()}/?strava=declined`);
  }
  const missing = STRAVA_SCOPES.split(",").filter((s) => !granted.includes(s));
  if (missing.length) {
    return NextResponse.redirect(`${appUrl()}/?strava=missing-scope`);
  }
  await exchangeCode(code);
  return NextResponse.redirect(`${appUrl()}/?strava=connected`);
}
