import { NextResponse, type NextRequest } from "next/server";
import { tokenMatches } from "@/lib/admin/auth";
import { buildAdminStats } from "@/lib/admin/stats";
import { fetchTraffic } from "@/lib/admin/traffic";
import { signedInAthlete } from "@/lib/auth/athlete";
import { ownerId } from "@/lib/auth/owner";
import { multiUser } from "@/lib/data/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The admin dashboard's data (F4): riders, how the plan is followed, and site
 * traffic. Only the server's owner (signed in) or a holder of ADMIN_TOKEN gets
 * it; anyone else gets a plain 404. Add ?download=1 to save it as a file.
 */
export async function GET(req: NextRequest) {
  const byToken = tokenMatches(req.headers.get("authorization"));
  const byOwner = !byToken && multiUser() && (await signedInAthlete()) === ownerId() && ownerId() !== null;
  if (!byToken && !byOwner) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const now = new Date();
  const [stats, traffic] = [buildAdminStats(now), await fetchTraffic(now)];
  const res = NextResponse.json({ version: 1, ...stats, traffic });
  res.headers.set("Cache-Control", "no-store");
  if (req.nextUrl.searchParams.get("download")) {
    res.headers.set("Content-Disposition", `attachment; filename="hour-power-admin-${now.toISOString().slice(0, 10)}.json"`);
  }
  return res;
}
