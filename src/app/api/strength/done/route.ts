import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { syncsGarmin } from "@/lib/garmin/resync";
import { resolveSession } from "@/lib/plan/session";
import { logStrength, unlogStrength } from "@/lib/plan/strengthLog";
import { badBody, rateLimited, readJsonBody } from "@/lib/security/requests";

export const runtime = "nodejs";

/** The planned gym session on this day and slot, if it's today or earlier. */
async function session(request: Request) {
  const limited = rateLimited("strength-done", request, 10, 60_000);
  if (limited) return { error: limited };
  let body: { date?: unknown; start?: unknown };
  try {
    body = await readJsonBody(request, 1024);
  } catch (e) {
    return { error: badBody(e) };
  }
  const { date, start } = body;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof start !== "string" || !/^\d{2}:\d{2}$/.test(start)) {
    return { error: NextResponse.json({ error: "Which session?" }, { status: 400 }) };
  }
  const found = resolveSession(date, start);
  if (!found?.planned.strength || found.planned.start !== start) return { error: NextResponse.json({ error: "There's no gym session then." }, { status: 404 }) };
  if (date > found.state.today) return { error: NextResponse.json({ error: "That session hasn't come yet." }, { status: 400 }) };
  return { planned: found.planned };
}

/** "Done it": count the gym session as done, and save it to Strava (once). */
async function post(request: Request) {
  const s = await session(request);
  if (s.error) return s.error;
  return NextResponse.json({ ok: true, ...(await logStrength(s.planned!)) });
}

/** Undo in Hour Power (a Strava copy stays: Strava can't delete it for us). */
async function remove(request: Request) {
  const s = await session(request);
  if (s.error) return s.error;
  return NextResponse.json({ ok: true, ...unlogStrength(s.planned!) });
}

export const POST = athleteRoute(syncsGarmin(post));
export const DELETE = athleteRoute(syncsGarmin(remove));
