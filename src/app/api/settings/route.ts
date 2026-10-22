import { NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/data/store";

const watts = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 50 && v <= 600;

/** Update rider preferences. Only known fields can be changed here. */
export async function POST(request: Request) {
  const body = (await request.json()) as { autoUpload?: unknown; trainingHourPower?: unknown; declinedHourPower?: unknown };
  const settings = loadSettings();
  if (typeof body.autoUpload === "boolean") settings.autoUpload = body.autoUpload;
  if (watts(body.trainingHourPower)) {
    settings.trainingHourPower = Math.round(body.trainingHourPower as number);
    settings.declinedHourPower = undefined;
  }
  if (watts(body.declinedHourPower)) settings.declinedHourPower = Math.round(body.declinedHourPower as number);
  saveSettings(settings);
  return NextResponse.json(settings);
}
