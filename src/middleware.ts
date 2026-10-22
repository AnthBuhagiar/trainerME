import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/** Pages and files reachable without signing in. */
const PUBLIC = [/^\/login$/, /^\/api\/strava\/(connect|callback)$/, /^\/(manifest\.webmanifest|icon.*\.png|apple-icon\.png|favicon\.ico)$/, /^\/brand\//];

export async function middleware(req: NextRequest) {
  if (!process.env.SESSION_SECRET) return NextResponse.next();
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((re) => re.test(path))) return NextResponse.next();
  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!_next/).*)"] };
