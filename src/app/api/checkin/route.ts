import { NextResponse } from "next/server";
import { MOODS, saveCheckIn, type Mood } from "@/lib/plan/checkin";

export async function POST(request: Request) {
  const { date, mood } = (await request.json()) as { date?: string; mood?: Mood | null };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Bad date." }, { status: 400 });
  if (mood !== null && !MOODS.includes(mood as Mood)) return NextResponse.json({ error: "Bad check-in." }, { status: 400 });
  saveCheckIn(date, mood ?? null);
  return NextResponse.json({ ok: true });
}
