import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { markDoneElsewhere, unmarkDoneElsewhere } from "@/lib/plan/completions";

const valid = (date: unknown, start: unknown) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof start === "string" && /^\d{2}:\d{2}$/.test(start);

/** Mark a trainer workout as done in another app. */
async function post(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: unknown; start?: unknown };
  if (!valid(body.date, body.start)) return NextResponse.json({ error: "Which session?" }, { status: 400 });
  markDoneElsewhere(body.date as string, body.start as string);
  return NextResponse.json({ ok: true });
}

/** Undo it. */
async function remove(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { date?: unknown; start?: unknown };
  if (!valid(body.date, body.start)) return NextResponse.json({ error: "Which session?" }, { status: 400 });
  unmarkDoneElsewhere(body.date as string, body.start as string);
  return NextResponse.json({ ok: true });
}

export const POST = athleteRoute(post);
export const DELETE = athleteRoute(remove);
