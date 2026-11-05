import { NextResponse } from "next/server";
import { watchRoute } from "@/lib/auth/athlete";
import { MOODS, saveCheckIn, type Mood } from "@/lib/plan/checkin";
import { loadState } from "@/lib/plan/current";
import { watchTodayFromState } from "@/lib/watch/state";
import { syncsGarmin } from "@/lib/garmin/resync";

export const runtime = "nodejs";

/** POST /api/watch/checkin {mood}: today's check-in from the watch (null clears it). Replies with the updated day. */
async function post(request: Request) {
  const { mood } = (await request.json().catch(() => ({}))) as { mood?: Mood | null };
  if (mood !== null && !MOODS.includes(mood as Mood)) return NextResponse.json({ error: "Bad check-in." }, { status: 400 });
  saveCheckIn(loadState().today, mood ?? null);
  return NextResponse.json(watchTodayFromState());
}

export const POST = watchRoute(syncsGarmin(post));
