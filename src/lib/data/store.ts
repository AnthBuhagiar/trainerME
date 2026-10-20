import fs from "node:fs";
import path from "node:path";
import type { Activity, AthleteSettings, Ride, RideStreams } from "@/lib/types";

/**
 * Local file store. Everything lives in data/ (git-ignored), so personal
 * training data never leaves the rider's machine or reaches the public repo.
 */

export const DATA_DIR = process.env.TRAINERME_DATA_DIR ?? path.join(process.cwd(), "data");

function file(...parts: string[]): string {
  return path.join(DATA_DIR, ...parts);
}

export function readJson<T>(rel: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file(rel), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(rel: string, value: unknown): void {
  const target = file(rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
}

/* Raw on-disk shapes (as returned by Strava / written by the stream processor). */

interface RawActivity {
  id: string;
  name: string;
  sport_type: string;
  start_local: string;
  is_trainer?: boolean;
  description?: string;
  summary: {
    distance: number;
    moving_time: number;
    elapsed_time: number;
    elevation_gain: number;
    relative_effort?: number;
  };
}

export interface RawRideSummary {
  id: string;
  samples: number;
  avg_watts?: number;
  np?: number | null;
  kj?: number;
  power_curve?: Record<string, number | null>;
  minutes?: [number, number][];
  avg_hr?: number;
  max_hr?: number;
  avg_cadence?: number;
  avg_temp?: number;
}

function toActivity(raw: RawActivity): Activity {
  return {
    id: raw.id,
    name: raw.name,
    sportType: raw.sport_type,
    startLocal: raw.start_local,
    isTrainer: raw.is_trainer ?? false,
    distance: raw.summary.distance,
    movingTime: raw.summary.moving_time,
    elapsedTime: raw.summary.elapsed_time,
    elevationGain: raw.summary.elevation_gain,
    relativeEffort: raw.summary.relative_effort,
    description: raw.description,
  };
}

function toStreams(raw: RawRideSummary): RideStreams {
  return {
    avgWatts: raw.avg_watts,
    np: raw.np ?? undefined,
    kj: raw.kj,
    powerCurve: raw.power_curve,
    minutes: raw.minutes,
    avgHr: raw.avg_hr,
    maxHr: raw.max_hr,
    avgCadence: raw.avg_cadence,
    avgTemp: raw.avg_temp,
  };
}

export function isRide(a: Activity): boolean {
  return a.sportType.includes("Ride");
}

/** Indoor rides: trainer flag, virtual platforms, or a stationary ride with no climbing. */
export function isIndoor(a: Activity): boolean {
  return a.isTrainer || a.sportType === "VirtualRide" || (a.elevationGain === 0 && a.sportType === "Ride");
}

export function loadActivities(): Activity[] {
  return readJson<RawActivity[]>("activities.json", []).map(toActivity);
}

export function saveRawActivities(raw: unknown[]): void {
  writeJson("activities.json", raw);
}

export function loadRawActivities(): RawActivity[] {
  return readJson<RawActivity[]>("activities.json", []);
}

export function saveRideSummary(summary: RawRideSummary): void {
  writeJson(path.join("rides", `${summary.id}.json`), summary);
}

export function hasRideSummary(id: string): boolean {
  return fs.existsSync(file("rides", `${id}.json`));
}

export function loadRides(): Ride[] {
  const rides: Ride[] = [];
  for (const activity of loadActivities()) {
    if (!isRide(activity)) continue;
    const raw = readJson<RawRideSummary | null>(path.join("rides", `${activity.id}.json`), null);
    rides.push({ ...activity, indoor: isIndoor(activity), streams: raw ? toStreams(raw) : undefined });
  }
  return rides.sort((a, b) => a.startLocal.localeCompare(b.startLocal));
}

const DEFAULT_SETTINGS: AthleteSettings = { weightKg: 77, acceptedFtp: 208, bikeWeightKg: 8.5 };

export function loadSettings(): AthleteSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<AthleteSettings>>("settings.json", {}) };
}

export function saveSettings(settings: AthleteSettings): void {
  writeJson("settings.json", settings);
}
