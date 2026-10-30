import {
  hasRideSummary,
  loadRawActivities,
  loadSettings,
  readJson,
  saveRawActivities,
  saveRideSummary,
  saveSettings,
  writeJson,
} from "@/lib/data/store";
import { StravaRateLimitError, stravaGet } from "@/lib/strava/client";
import { summariseStreams, type RawStreams } from "@/lib/strava/process";
import { zoneFromStrava } from "@/lib/engine/dates";

/**
 * Pull the athlete's activities and ride streams into data/.
 * Streams cost one request per ride, so a run is capped and the rest
 * continue on the next sync (Strava rate-limits per 15 minutes).
 */

const PAGE_SIZE = 200;
export const DEFAULT_STREAM_BUDGET = 80;

interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date_local: string;
  trainer?: boolean;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  suffer_score?: number | null;
  /** e.g. "(GMT+10:00) Australia/Sydney" */
  timezone?: string;
}

interface StravaAthlete {
  weight?: number | null;
  ftp?: number | null;
}

type StreamSet = Record<string, { data: (number | null)[] } | undefined>;

export interface SyncResult {
  newActivities: number;
  totalActivities: number;
  streamsFetched: number;
  ridesMissingStreams: number;
  rateLimited: boolean;
}

function toRaw(a: StravaActivity) {
  return {
    id: String(a.id),
    source: "strava" as const,
    name: a.name,
    sport_type: a.sport_type,
    start_local: a.start_date_local.replace(/Z$/, ""),
    is_trainer: a.trainer ?? false,
    summary: {
      distance: a.distance,
      moving_time: a.moving_time,
      elapsed_time: a.elapsed_time,
      elevation_gain: a.total_elevation_gain,
      relative_effort: a.suffer_score ?? undefined,
    },
  };
}

async function syncProfile(): Promise<void> {
  const athlete = await stravaGet<StravaAthlete>("/athlete");
  const settings = loadSettings();
  saveSettings({
    ...settings,
    weightKg: athlete.weight || settings.weightKg,
    acceptedFtp: athlete.ftp || settings.acceptedFtp,
  });
}

async function syncActivities(): Promise<number> {
  const existing = loadRawActivities();
  const byId = new Map(existing.map((a) => [a.id, a]));
  const latest = existing.filter((a) => a.source !== "intervals").reduce((max, a) => (a.start_local > max ? a.start_local : max), "");
  // Re-read the last week each time so edits (names, trainer flag) are picked up.
  const after = latest ? Math.floor(Date.parse(`${latest}Z`) / 1000) - 7 * 86_400 : 0;
  let added = 0;
  let newest: StravaActivity | undefined;
  for (let page = 1; ; page++) {
    const batch = await stravaGet<StravaActivity[]>("/athlete/activities", { per_page: PAGE_SIZE, page, after });
    for (const a of batch) {
      if (!newest || a.start_date_local > newest.start_date_local) newest = a;
      if (!byId.has(String(a.id))) added++;
      byId.set(String(a.id), { ...byId.get(String(a.id)), ...toRaw(a) });
    }
    if (batch.length < PAGE_SIZE) break;
  }
  const merged = [...byId.values()].sort((a, b) => a.start_local.localeCompare(b.start_local));
  saveRawActivities(merged);
  // The rider's time zone, from where they last rode: decides what "today" is.
  if (newest?.timezone) {
    const zone = zoneFromStrava(newest.timezone);
    const settings = loadSettings();
    if (zone && zone !== settings.timeZone) saveSettings({ ...settings, timeZone: zone });
  }
  return added;
}

async function fetchStreams(id: string): Promise<RawStreams> {
  const set = await stravaGet<StreamSet>(`/activities/${id}/streams`, {
    keys: "time,watts,heartrate,cadence,temp",
    key_by_type: "true",
  });
  return {
    time: (set.time?.data as number[]) ?? [],
    watts: set.watts?.data,
    heartrate: set.heartrate?.data,
    cadence: set.cadence?.data,
    temp: set.temp?.data,
  };
}

const SYNC_STATE = "sync-state.json";

/** When the last sync finished (epoch ms), or null if never. */
export function lastSyncedAt(): number | null {
  return readJson<{ lastSyncedAt?: number }>(SYNC_STATE, {}).lastSyncedAt ?? null;
}

export async function syncStrava(streamBudget = DEFAULT_STREAM_BUDGET): Promise<SyncResult> {
  let rateLimited = false;
  let newActivities = 0;
  let streamsFetched = 0;
  try {
    await syncProfile();
    newActivities = await syncActivities();
    // Newest rides first: they matter most for today's estimate.
    const pending = loadRawActivities()
      .filter((a) => a.source !== "intervals" && a.sport_type.includes("Ride") && !hasRideSummary(a.id))
      .reverse();
    for (const ride of pending.slice(0, streamBudget)) {
      saveRideSummary(summariseStreams(ride.id, await fetchStreams(ride.id)));
      streamsFetched++;
    }
  } catch (err) {
    if (!(err instanceof StravaRateLimitError)) throw err;
    rateLimited = true;
  }
  const all = loadRawActivities();
  writeJson(SYNC_STATE, { lastSyncedAt: Date.now() });
  return {
    newActivities,
    totalActivities: all.length,
    streamsFetched,
    ridesMissingStreams: all.filter((a) => a.source !== "intervals" && a.sport_type.includes("Ride") && !hasRideSummary(a.id)).length,
    rateLimited,
  };
}
