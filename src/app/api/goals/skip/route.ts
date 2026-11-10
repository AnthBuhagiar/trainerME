import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { loadSettings, saveSettings } from "@/lib/data/store";
import { appUrl } from "@/lib/strava/client";

/** "Skip for now" on the first-time goal page: go to Today and don't ask again. */
async function post() {
  saveSettings({ ...loadSettings(), goalAsked: true });
  return NextResponse.redirect(`${appUrl()}/`, 303);
}

export const POST = athleteRoute(post);
