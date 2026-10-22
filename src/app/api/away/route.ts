import { NextResponse } from "next/server";
import { loadAway, saveAway, type AwayKind } from "@/lib/plan/away";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  return NextResponse.json(loadAway());
}

export async function POST(request: Request) {
  const body = (await request.json()) as { start?: string; end?: string; kind?: AwayKind; note?: string };
  const start = body.start ?? "";
  const end = body.end || start;
  if (!DATE.test(start) || !DATE.test(end) || end < start) return NextResponse.json({ error: "Pick a start and end date." }, { status: 400 });
  if (body.kind !== "away" && body.kind !== "busy") return NextResponse.json({ error: "Pick away or busy." }, { status: 400 });
  const periods = loadAway();
  periods.push({ id: `${start}-${Date.now().toString(36)}`, start, end, kind: body.kind, note: body.note?.trim().slice(0, 80) || undefined });
  saveAway(periods);
  return NextResponse.json(loadAway());
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  saveAway(loadAway().filter((p) => p.id !== id));
  return NextResponse.json(loadAway());
}
