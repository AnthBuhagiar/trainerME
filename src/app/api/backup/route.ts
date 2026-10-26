import { athleteRoute } from "@/lib/auth/athlete";
import { NextResponse } from "next/server";
import { createBackup, restoreBackup, type Backup } from "@/lib/data/backup";

export const runtime = "nodejs";

function get() {
  const backup = createBackup();
  return new NextResponse(JSON.stringify(backup), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="hour-power-backup-${backup.createdAt.slice(0, 10)}.json"`,
    },
  });
}

async function post(request: Request) {
  try {
    const restored = restoreBackup((await request.json()) as Backup);
    return NextResponse.json({ restored });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export const GET = athleteRoute(get);
export const POST = athleteRoute(post);
