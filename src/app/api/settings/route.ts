import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/data/store";

/** Update rider preferences. Only known boolean switches can be changed here. */
export async function POST(request: Request) {
  const body = (await request.json()) as { autoUpload?: unknown };
  const settings = loadSettings();
  if (typeof body.autoUpload === "boolean") settings.autoUpload = body.autoUpload;
  saveSettings(settings);
  return NextResponse.json(settings);
}
