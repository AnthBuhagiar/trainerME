import { NextResponse } from "next/server";
import { bearer } from "@/lib/watch/key";
import { collectLink, startLink } from "@/lib/watch/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * For the watch, before it's linked (no sign-in):
 * POST /api/watch/link                          a code to show, and the watch's token
 * GET  /api/watch/link  (Bearer <token>)        {status: "waiting" | "linked", key | "expired"}
 */
export async function POST() {
  const link = startLink();
  if (!link) return NextResponse.json({ error: "Too many watches linking right now. Try again in a few minutes." }, { status: 429 });
  return NextResponse.json(link, { headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request) {
  const result = collectLink(bearer(request));
  return NextResponse.json(result, { status: result.status === "expired" ? 410 : 200, headers: { "cache-control": "no-store" } });
}
