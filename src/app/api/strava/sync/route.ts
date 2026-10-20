import { NextResponse } from "next/server";
import { syncStrava } from "@/lib/strava/sync";

export const runtime = "nodejs";

/** Pulls new activities and up to a batch of ride streams from Strava. */
export async function POST() {
  try {
    return NextResponse.json(await syncStrava());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
