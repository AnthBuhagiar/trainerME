import { NextResponse } from "next/server";
import { applyUpdate, checkForUpdate, updatesEnabled } from "@/lib/update/git";

export const runtime = "nodejs";

export async function GET() {
  if (!updatesEnabled()) return NextResponse.json({ enabled: false });
  try {
    return NextResponse.json({ enabled: true, ...(await checkForUpdate()) });
  } catch (e) {
    return NextResponse.json({ enabled: true, error: (e as Error).message.slice(0, 300) });
  }
}

export async function POST() {
  if (!updatesEnabled()) return NextResponse.json({ error: "Updates only run in the codespace." }, { status: 403 });
  try {
    return NextResponse.json(await applyUpdate());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message.slice(0, 300) }, { status: 500 });
  }
}
