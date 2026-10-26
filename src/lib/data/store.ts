import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import type { Activity, AthleteSettings, Ride, RideStreams } from "@/lib/types";

/**
 * Local file store. Everything lives in data/ (git-ignored), so personal
 * training data never leaves the rider's machine or reaches the public repo.
 */

export const DATA_DIR = process.env.TRAINERME_DATA_DIR ?? path.join(process.cwd(), "data");

/**
 * Hosted with sign-in, every athlete has their own folder, data/athletes/<id>,
 * and each request reads and writes only the signed-in athlete's. Without
 * sign-in (codespace, own computer) there's one rider and data/ is theirs.
 */
const scope = new AsyncLocalStorage<{ athleteId: number; dir: string }>();

export const multiUser = () => !!process.env.SESSION_SECRET;

export function athleteDir(athleteId: number): string {
  if (!Number.isSafeInteger(athleteId) || athleteId <= 0) throw new Error("Not an athlete id.");
  return path.join(DATA_DIR, "athletes", String(athleteId));
}

/** Run `fn` with this athlete's data. Everything it reads or writes stays in their folder. */
export function runAsAthlete<T>(athleteId: number, fn: () => T): T {
  return scope.run({ athleteId, dir: athleteDir(athleteId) }, fn);
}

/** The signed-in athlete for this request, if any. */
export function currentAthlete(): number | null {
  return scope.getStore()?.athleteId ?? null;
}

/** The folder for this request's data. Hosted, refuse rather than fall back to a shared folder. */
export function dataDir(): string {
  const s = scope.getStore();
  if (s) return s.dir;
  if (multiUser()) throw new Error("No signed-in athlete for this request.");
  return DATA_DIR;
}

function file(...parts: string[]): string {
  return path.join(dataDir(), ...parts);
}

export function readJson<T>(rel: string, fallback: T): T {
  const target = file(rel); // outside the try: a missing athlete must fail, not read as empty
  try {
    return JSON.parse(fs.readFileSync(target, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Server-wide records (who owns the server), outside any athlete's folder. */
export function readServerJson<T>(rel: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, rel), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeServerJson(rel: string, value: unknown): void {
  writeFileAtomic(path.join(DATA_DIR, rel), value);
}

export function writeJson(rel: string, value: unknown): void {
  writeFileAtomic(file(rel), value);
}

function writeFileAtomic(target: string, value: unknown): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, target);
}

/* Raw on-disk shapes (as returned by Strava / written by the stream processor). */

export interface RawActivity {
  id: string;
  /** Where it came from; Strava when missing (older files). */
  source?: "strava" | "intervals";
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

/**
 * The same ride can arrive from Strava and from Intervals.icu (e.g. a Garmin upload synced to both).
 * Treat activities of the same kind starting within 2 minutes with similar length as one, keeping
 * the copy whose streams are downloaded, then the Strava one.
 */
export function dedupeActivities(raw: RawActivity[], hasStreams: (id: string) => boolean = hasRideSummary): RawActivity[] {
  const sorted = [...raw].sort((a, b) => a.start_local.localeCompare(b.start_local));
  const kept: RawActivity[] = [];
  const rank = (a: RawActivity) => (hasStreams(a.id) ? 2 : 0) + (a.source !== "intervals" ? 1 : 0);
  for (const a of sorted) {
    // Sorted by start, so only the last few kept activities can be within 2 minutes.
    const start = Date.parse(`${a.start_local}Z`);
    let i = -1;
    for (let j = kept.length - 1; j >= 0; j--) {
      const k = kept[j];
      const gap = start - Date.parse(`${k.start_local}Z`);
      if (gap > 120_000) break;
      const sameKind = k.sport_type.includes("Ride") === a.sport_type.includes("Ride");
      const lengths = [k.summary.moving_time, a.summary.moving_time];
      const similar = Math.min(...lengths) >= 0.8 * Math.max(...lengths);
      if (k.source !== a.source && sameKind && similar) {
        i = j;
        break;
      }
    }
    if (i < 0) kept.push(a);
    else if (rank(a) > rank(kept[i])) kept[i] = a;
  }
  return kept;
}

/**
 * Changes whenever a sync writes activities or ride files (writeJson renames
 * into the folder, which updates its modified time).
 */
export function rideDataVersion(): string {
  const at = (p: string) => {
    try {
      return fs.statSync(p).mtimeMs;
    } catch {
      return 0;
    }
  };
  return `${dataDir()}:${at(file("activities.json"))}:${at(file("rides"))}`;
}

/** A few recent entries per kind, so riders signed in at the same time don't push each other out. */
export function smallCache<T>(size = 20) {
  const m = new Map<string, { version: string; value: T }>();
  return (key: string, version: string, make: () => T): T => {
    const hit = m.get(key);
    if (hit?.version === version) return hit.value;
    const value = make();
    m.delete(key);
    m.set(key, { version, value });
    if (m.size > size) m.delete(m.keys().next().value!);
    return value;
  };
}

const activitiesCache = smallCache<Activity[]>();
const ridesCache = smallCache<Ride[]>();

/** Read once and kept until the next sync: every screen needs them, and parsing them is the slow part. */
export function loadActivities(): Activity[] {
  return activitiesCache(dataDir(), rideDataVersion(), () => dedupeActivities(readJson<RawActivity[]>("activities.json", [])).map(toActivity));
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
  return ridesCache(dataDir(), rideDataVersion(), readRides);
}

function readRides(): Ride[] {
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
