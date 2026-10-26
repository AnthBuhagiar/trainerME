import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { moveSingleRiderData, ownerId } from "@/lib/auth/owner";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { multiUser, runAsAthlete } from "@/lib/data/store";

/** The athlete signed in on this request (hosted copies only). */
export async function signedInAthlete(): Promise<number | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

function enter<T>(athleteId: number, fn: () => T): T {
  if (athleteId === ownerId()) moveSingleRiderData(athleteId);
  return runAsAthlete(athleteId, fn);
}

/**
 * Render a page with the signed-in athlete's data. Pages read everything they
 * need inside `fn`; what they hand on to components is plain values.
 */
export async function asAthlete<T>(fn: () => T | Promise<T>): Promise<T> {
  if (!multiUser()) return fn();
  const id = await signedInAthlete();
  if (!id) redirect("/login");
  return enter(id, fn);
}

/** The same for an API route: 401 instead of a redirect. */
export function athleteRoute<A extends unknown[]>(handler: (...args: A) => Response | Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    if (!multiUser()) return handler(...args);
    const id = await signedInAthlete();
    if (!id) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return enter(id, () => handler(...args));
  };
}
