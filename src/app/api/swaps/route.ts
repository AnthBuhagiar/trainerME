import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { catalogueEntry } from "@/lib/plan/catalogue";
import { setSwap } from "@/lib/plan/swaps";
import { syncsGarmin } from "@/lib/garmin/resync";

/** Swap a planned ride for another workout, or (id null) go back to the planned one. */
async function post(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: unknown; start?: unknown; id?: unknown };
  const ok = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) && typeof body.start === "string" && /^\d{2}:\d{2}$/.test(body.start);
  const id = body.id === null ? null : typeof body.id === "string" && catalogueEntry(body.id) ? body.id : undefined;
  if (!ok || id === undefined) return NextResponse.json({ error: "Which session and workout?" }, { status: 400 });
  setSwap(body.date as string, body.start as string, id);
  return NextResponse.json({ ok: true });
}

export const POST = athleteRoute(syncsGarmin(post));
