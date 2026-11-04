import { NextResponse } from "next/server";
import { athleteRoute } from "@/lib/auth/athlete";
import { isIndoor, isRide, loadActivities, loadSettings } from "@/lib/data/store";
import { localToUtc } from "@/lib/engine/dates";
import { buildFit, type FitPoint, type FitSport } from "@/lib/export/fit";
import { physicsFor } from "@/lib/goals/summary";
import { keptSamples } from "@/lib/player/keepRide";
import { virtualSpeed } from "@/lib/player/virtualSpeed";
import { StravaRateLimitError, stravaGet } from "@/lib/strava/client";
import type { Activity } from "@/lib/types";

export const runtime = "nodejs";

type Streams = Record<string, { data: unknown[] } | undefined>;

function sportOf(a: Activity): FitSport {
  if (isRide(a)) return isIndoor(a) ? "indoor-cycling" : "cycling";
  return a.sportType.includes("Run") ? "running" : "other";
}

/** Every second of the activity: kept by Hour Power for player rides, otherwise from Strava. */
/** Indoors there's no distance: give it the flat-road speed of the power, as on the ride's own page. */
function withVirtualSpeed(points: FitPoint[]): FitPoint[] {
  if (points.some((p) => p.distance !== undefined)) return points;
  const moving = virtualSpeed(points, physicsFor(loadSettings()));
  return points.map((p, i) => ({ ...p, speed: moving[i].speed, distance: moving[i].distance }));
}

async function pointsFor(a: Activity): Promise<FitPoint[] | null> {
  const kept = keptSamples(a.id);
  if (kept) return withVirtualSpeed(kept.map((s) => ({ t: s.t, power: s.power, hr: s.hr, cadence: s.cadence })));
  if (!/^\d+$/.test(a.id)) return null; // Intervals.icu activities: not from Strava
  const s = await stravaGet<Streams>(`/activities/${a.id}/streams`, {
    keys: "time,watts,heartrate,cadence,distance,velocity_smooth,altitude,latlng",
    key_by_type: "true",
  });
  const col = (k: string) => s[k]?.data as (number | null)[] | undefined;
  const time = col("time") ?? [];
  const latlng = s.latlng?.data as ([number, number] | null)[] | undefined;
  const v = (xs: (number | null)[] | undefined, i: number) => (xs?.[i] ?? undefined) as number | undefined;
  const points: FitPoint[] = time.map((t, i) => ({
    t: t ?? i,
    power: v(col("watts"), i),
    hr: v(col("heartrate"), i),
    cadence: v(col("cadence"), i),
    distance: v(col("distance"), i),
    speed: v(col("velocity_smooth"), i),
    altitude: v(col("altitude"), i),
    lat: latlng?.[i]?.[0],
    lng: latlng?.[i]?.[1],
  }));
  return isIndoor(a) ? withVirtualSpeed(points) : points;
}

/** The activity as a .fit file, for importing into Garmin Connect. */
async function get(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = loadActivities().find((a) => a.id === id);
  if (!activity) return NextResponse.json({ error: "No such activity." }, { status: 404 });
  try {
    const points = await pointsFor(activity);
    if (!points) return NextResponse.json({ error: "This activity can't be downloaded from here." }, { status: 404 });
    const zone = loadSettings().timeZone ?? process.env.APP_TIMEZONE;
    const startMs = localToUtc(activity.startLocal, zone);
    const offsetS = Math.round((Date.parse(`${activity.startLocal}Z`) - startMs) / 1000);
    const file = buildFit(startMs, points, sportOf(activity), offsetS);
    const name = `${activity.startLocal.slice(0, 10)} ${activity.name}`.replace(/[^\w\s×.-]+/g, "").trim().slice(0, 80) || "ride";
    return new NextResponse(Buffer.from(file), {
      headers: {
        "content-type": "application/vnd.ant.fit",
        "content-disposition": `attachment; filename="${name.replace(/×/g, "x")}.fit"; filename*=UTF-8''${encodeURIComponent(name)}.fit`,
      },
    });
  } catch (e) {
    const rate = e instanceof StravaRateLimitError;
    return NextResponse.json({ error: rate ? e.message : `Couldn't get the ride from Strava: ${(e as Error).message}` }, { status: rate ? 429 : 502 });
  }
}

export const GET = athleteRoute(get);
