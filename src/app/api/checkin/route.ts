import { athleteRoute } from "@/lib/auth/athlete";
import { NextResponse } from "next/server";
import { MOODS, saveCheckIn, type Mood } from "@/lib/plan/checkin";
import { syncsGarmin } from "@/lib/garmin/resync";
import { badBody, rateLimited, readJsonBody } from "@/lib/security/requests";

async function post(request: Request) {
  const limited = rateLimited("checkin", request, 30, 60_000);
  if (limited) return limited;
  let date: string | undefined;
  let mood: Mood | null | undefined;
  try {
    ({ date, mood } = await readJsonBody<{ date?: string; mood?: Mood | null }>(request, 4096));
  } catch (e) {
    return badBody(e);
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Bad date." }, { status: 400 });
  if (mood !== null && !MOODS.includes(mood as Mood)) return NextResponse.json({ error: "Bad check-in." }, { status: 400 });
  saveCheckIn(date, mood ?? null);
  return NextResponse.json({ ok: true });
}

export const POST = athleteRoute(syncsGarmin(post));
