import { NextResponse } from "next/server";
import { watchRoute } from "@/lib/auth/athlete";
import { watchTodayFromState } from "@/lib/watch/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/watch/today               the watch app's day: hour power, week, today's session with steps, goal
 * GET /api/watch/today?minutes=35    the same, with today's ride fitted to 35 min
 */
async function get(request: Request) {
  const minutes = Number(new URL(request.url).searchParams.get("minutes")) || undefined;
  return NextResponse.json(watchTodayFromState(minutes), { headers: { "cache-control": "no-store" } });
}

export const GET = watchRoute(get);
