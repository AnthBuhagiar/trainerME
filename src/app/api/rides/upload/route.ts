import { NextResponse } from "next/server";
import { canUpload, stravaUpload } from "@/lib/strava/client";
import { buildTcx, type RideSample } from "@/lib/strava/tcx";

export const runtime = "nodejs";

interface Body {
  name: string;
  startMs: number;
  samples: RideSample[];
}

/** Upload a ride recorded in the player to Strava. */
export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  if (!body.samples?.length || !Number.isFinite(body.startMs)) return NextResponse.json({ error: "Nothing recorded yet." }, { status: 400 });
  if (!canUpload()) {
    return NextResponse.json({ error: "Reconnect Strava and tick “Upload your activities” so Hour Power can save rides.", reconnect: true }, { status: 403 });
  }
  try {
    const result = await stravaUpload(buildTcx(body.startMs, body.samples, "Ridden with Hour Power"), {
      name: body.name,
      description: "Ridden with Hour Power",
      externalId: `hourpower-${body.startMs}`,
    });
    return NextResponse.json(result, { status: result.error ? 422 : 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
