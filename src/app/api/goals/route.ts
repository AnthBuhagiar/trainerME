import { NextResponse } from "next/server";
import { loadGoals, saveGoals, upsertGoal } from "@/lib/goals/model";
import { parseGoal } from "@/lib/goals/parse";

export async function GET() {
  return NextResponse.json(loadGoals());
}

export async function POST(request: Request) {
  const parsed = parseGoal(await request.json(), loadGoals());
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });
  return NextResponse.json(upsertGoal(parsed));
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  saveGoals(loadGoals().filter((g) => g.id !== id));
  return NextResponse.json(loadGoals());
}
