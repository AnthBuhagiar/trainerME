import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { confirmLink } from "@/lib/watch/link";
import { allow, clientKey } from "@/lib/security/rateLimit";
import { badBody, rateLimited, readJsonBody } from "@/lib/security/requests";

export const runtime = "nodejs";

/** POST /api/watch/link/confirm {code}: the signed-in rider links the watch showing this code. */
async function post(request: Request) {
  // Ten tries per rider (and thirty per client) every ten minutes: far too few to guess a 6-character code.
  const limited = rateLimited("watch-link-confirm", request, 10, 10 * 60_000);
  if (limited) return limited;
  if (!allow(`watch-link-confirm-ip:${clientKey(request)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
  }
  let code: string | undefined;
  try {
    ({ code } = await readJsonBody<{ code?: string }>(request, 1024));
  } catch (e) {
    return badBody(e);
  }
  if (!code || !confirmLink(code, multiUser() ? currentAthlete() : null)) {
    return NextResponse.json({ error: "That code isn't right or has run out. Check the watch for its current code." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = athleteRoute(post);
