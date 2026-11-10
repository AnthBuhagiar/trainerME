import { NextResponse } from "next/server";
import { watchRoute } from "@/lib/auth/athlete";
import { MOODS, saveCheckIn, type Mood } from "@/lib/plan/checkin";
import { loadState } from "@/lib/plan/current";
import { watchTodayFromState } from "@/lib/watch/state";
import { syncsGarmin } from "@/lib/garmin/resync";
import { badBody, rateLimited, readJsonBody } from "@/lib/security/requests";

export const runtime = "nodejs";

/** POST /api/watch/checkin {mood}: today's check-in from the watch (null clears it). Replies with the updated day. */
async function post(request: Request) {
  const limited = rateLimited("watch-checkin", request, 30, 60_000);
  if (limited) return limited;
  let mood: Mood | null | undefined;
  try {
    ({ mood } = await readJsonBody<{ mood?: Mood | null }>(request, 4096));
  } catch (e) {
    return badBody(e);
  }
  if (mood !== null && !MOODS.includes(mood as Mood)) return NextResponse.json({ error: "Bad check-in." }, { status: 400 });
  saveCheckIn(loadState().today, mood ?? null);
  return NextResponse.json(watchTodayFromState());
}

export const POST = watchRoute(syncsGarmin(post));
