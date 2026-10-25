import { NextResponse } from "next/server";
import { erg, ics, zwo } from "@/lib/export/formats";
import { zip } from "@/lib/export/zip";
import { loadState, nextWeekStart } from "@/lib/plan/current";
import { resolveSession } from "@/lib/plan/session";
import { appUrl } from "@/lib/strava/client";

export const runtime = "nodejs";

const TYPES = { zwo: "application/xml", erg: "text/plain", ics: "text/calendar", zip: "application/zip" };

function file(name: string, body: string | Uint8Array, type: string) {
  return new NextResponse(body as BodyInit, {
    headers: { "content-type": `${type}; charset=utf-8`, "content-disposition": `attachment; filename="${name}"` },
  });
}

/**
 * GET /api/export?format=zwo|erg|ics            the rest of this week and next week
 * GET /api/export?format=…&date=YYYY-MM-DD&start=HH:MM  one session
 */
export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const format = q.get("format");
  if (format !== "zwo" && format !== "erg" && format !== "ics") return NextResponse.json({ error: "Pick zwo, erg or ics." }, { status: 400 });

  let sessions;
  let hourPower: number;
  const date = q.get("date");
  if (date) {
    const found = resolveSession(date, q.get("start") ?? undefined, q.get("minutes") ?? undefined);
    if (!found) return NextResponse.json({ error: "No session that day." }, { status: 404 });
    sessions = [found.session];
    hourPower = found.hourPower;
  } else {
    const state = loadState();
    sessions = [...state.week(state.thisWeekStart).sessions, ...state.week(nextWeekStart(state.thisWeekStart)).sessions].filter((s) => s.date >= state.today);
    hourPower = state.targets?.training ?? 0;
  }
  if (!hourPower) return NextResponse.json({ error: "Sync your rides first so targets can be set." }, { status: 400 });

  if (format === "ics") return file(date ? `hour-power-${date}.ics` : "hour-power-plan.ics", ics(sessions, hourPower, appUrl()), TYPES.ics);
  const rides = sessions.filter((s) => s.ride);
  if (!rides.length) return NextResponse.json({ error: "No rides to export." }, { status: 404 });
  const make = format === "zwo" ? zwo : erg;
  const files = rides.map((s) => make(s, hourPower));
  if (files.length === 1) return file(files[0].name, files[0].content, TYPES[format]);
  return file(`hour-power-${format}.zip`, zip(files), TYPES.zip);
}
