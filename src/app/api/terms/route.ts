import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { acceptTerms } from "@/lib/legal/acceptance";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { appUrl } from "@/lib/strava/client";

export const runtime = "nodejs";

/** The signed-in rider accepts the current terms (the box must be ticked for this version). */
async function post(request: Request) {
  const form = await request.formData().catch(() => null);
  if (form?.get("agree") !== TERMS_VERSION) return NextResponse.redirect(`${appUrl()}/terms?accept=1&error=tick`, 303);
  acceptTerms();
  return NextResponse.redirect(`${appUrl()}/`, 303);
}

export const POST = athleteRoute(post, { beforeTerms: true });
