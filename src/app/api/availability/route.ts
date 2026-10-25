import { NextResponse } from "next/server";
import { parseChoices, saveAvailability } from "@/lib/plan/availability";

/** Save the rider's chosen days, or (with {reset: true}) go back to the week learned from their rides. */
export async function POST(request: Request) {
  const body = (await request.json()) as { days?: unknown; reset?: boolean };
  if (body.reset) {
    saveAvailability(null);
    return NextResponse.json({ ok: true });
  }
  const days = parseChoices(body.days);
  if (typeof days === "string") return NextResponse.json({ error: days }, { status: 400 });
  saveAvailability(days);
  return NextResponse.json({ ok: true });
}
