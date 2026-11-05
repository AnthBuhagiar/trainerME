import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { confirmLink } from "@/lib/watch/link";

export const runtime = "nodejs";

/** POST /api/watch/link/confirm {code}: the signed-in rider links the watch showing this code. */
async function post(request: Request) {
  const { code } = (await request.json().catch(() => ({}))) as { code?: string };
  if (!code || !confirmLink(code, multiUser() ? currentAthlete() : null)) {
    return NextResponse.json({ error: "That code isn't right or has run out. Check the watch for its current code." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = athleteRoute(post);
