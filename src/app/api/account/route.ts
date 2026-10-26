import fs from "node:fs";
import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { currentAthlete, dataDir, multiUser } from "@/lib/data/store";
import { appUrl, deauthorize } from "@/lib/strava/client";

export const runtime = "nodejs";

/** Delete my account: revoke Strava access and remove every file Hour Power holds for this athlete. */
async function post() {
  if (!multiUser() || !currentAthlete()) return NextResponse.json({ error: "Only on a shared Hour Power." }, { status: 400 });
  await deauthorize();
  fs.rmSync(dataDir(), { recursive: true, force: true });
  const res = NextResponse.redirect(`${appUrl()}/login?deleted=1`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const POST = athleteRoute(post);
