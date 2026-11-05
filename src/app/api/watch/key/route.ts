import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { revokeWatchKey } from "@/lib/watch/key";

/** DELETE: unlink the watch (its key stops working at once). Linking is /api/watch/link. */
export const DELETE = athleteRoute(async () => {
  revokeWatchKey();
  return NextResponse.json({ ok: true });
});
