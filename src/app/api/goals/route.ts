import { athleteRoute } from "@/lib/auth/athlete";
import { NextResponse } from "next/server";
import { loadGoals, saveGoals, saveRoute, upsertGoal } from "@/lib/goals/model";
import { parseGoal } from "@/lib/goals/parse";

async function get() {
  return NextResponse.json(loadGoals());
}

async function post(request: Request) {
  const body = await request.json();
  const parsed = parseGoal(body, loadGoals());
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  // An imported route (parsed in the browser) replaces any earlier one.
  const route = body.route;
  if (route && Array.isArray(route.segments) && route.segments.length && parsed.event) {
    saveRoute(parsed.id, route);
    parsed.event.routeName = String(route.name ?? "Route").slice(0, 120);
  } else if (body.removeRoute && parsed.event) {
    parsed.event.routeName = undefined;
  }
  return NextResponse.json(upsertGoal(parsed));
}

async function remove(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  saveGoals(loadGoals().filter((g) => g.id !== id));
  return NextResponse.json(loadGoals());
}

export const GET = athleteRoute(get);
export const POST = athleteRoute(post);
export const DELETE = athleteRoute(remove);
