import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { markReminderSeen, recordReferrer, type RecordResult } from "@/lib/referral/referral";

export const runtime = "nodejs";

const MESSAGES: Record<Exclude<RecordResult, "saved">, string> = {
  "unknown-code": "That code isn’t one we know. Check it with the rider who gave it to you.",
  "own-code": "That’s your own code. Enter the code of the rider who recommended Hour Power.",
  "already-set": "You’ve already added who recommended you.",
  "already-paid": "A recommender can only be added before your subscription starts.",
};

/** A rider who skipped it at sign-up adds who recommended them (once), or closes this week's reminder. */
async function post(request: Request) {
  const id = currentAthlete();
  if (!multiUser() || !id) return NextResponse.json({ error: "Only on a shared Hour Power." }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { code?: unknown; reminderSeen?: unknown };
  if (body.reminderSeen === true) {
    markReminderSeen(id);
    return NextResponse.json({ ok: true });
  }
  const result = recordReferrer(id, body.code);
  if (result !== "saved") return NextResponse.json({ error: MESSAGES[result] }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export const POST = athleteRoute(post);
