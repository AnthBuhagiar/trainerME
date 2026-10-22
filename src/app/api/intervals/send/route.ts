import { NextResponse } from "next/server";
import { sendSessions } from "@/lib/intervals/client";
import { loadState, nextMonday } from "@/lib/plan/current";

/** Send the rest of this week and next week to Intervals.icu (and on to Garmin). */
export async function POST() {
  const state = loadState();
  if (!state.current) return NextResponse.json({ error: "Sync Strava first so targets can be set from your hour power." }, { status: 400 });
  const next = nextMonday(state.thisMonday);
  const sessions = [...state.week(state.thisMonday).sessions, ...state.week(next).sessions].filter((s) => s.date >= state.today);
  const newest = new Date(Date.parse(`${next}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  try {
    return NextResponse.json(await sendSessions(sessions, state.targets!.training, state.today, newest));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
