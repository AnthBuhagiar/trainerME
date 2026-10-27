import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/** Pages and files reachable without signing in. */
const PUBLIC = [/^\/login$/, /^\/privacy$/, /^\/terms$/, /^\/api\/strava\/(connect|callback|webhook)$/, /^\/(manifest\.webmanifest|icon.*\.png|apple-icon\.png|favicon\.ico)$/, /^\/brand\//];

export async function middleware(req: NextRequest) {
  if (!process.env.SESSION_SECRET) {
    // A public server without sign-in would show anyone your rides: refuse to serve rather than run open.
    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_NO_LOGIN) {
      return new NextResponse("Hour Power is not set up yet: add SESSION_SECRET (see README).", { status: 503 });
    }
    return NextResponse.next();
  }
  const path = req.nextUrl.pathname;
  if (PUBLIC.some((re) => re.test(path))) return NextResponse.next();
  if (await verifySession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  // Behind a proxy, req.url carries the internal address (localhost), so build the link from the public one.
  return NextResponse.redirect(new URL("/login", process.env.APP_URL || req.url));
}

export const config = { matcher: ["/((?!_next/).*)"] };
