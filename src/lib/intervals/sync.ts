import { hasRideSummary, loadRawActivities, saveRawActivities, saveRideSummary, type RawActivity } from "@/lib/data/store";
import { hasIntervalsKey, intervalsGet } from "@/lib/intervals/client";
import { summariseStreams, type RawStreams } from "@/lib/strava/process";

/**
 * Intervals.icu as a second ride source. Reads activities and their power and
 * heart-rate streams with the rider's API key. Rides that Intervals.icu got
 * from Strava aren't shared over its API (Strava's terms), so this mainly adds
 * rides recorded on Garmin, Wahoo, Zwift and the like. Duplicates of Strava
 * rides are merged when activities load (store.dedupeActivities).
 */

interface IntervalsActivity {
  id: string;
  name?: string;
  type?: string;
  start_date_local?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  trainer?: boolean;
  icu_training_load?: number;
  /** Present on placeholders for activities Intervals.icu can't share (e.g. from Strava). */
  _note?: string;
}

type IntervalsStream = { type: string; data: (number | null)[] };

/** First sync looks back two years, later ones re-read the last week. */
const FIRST_SYNC_DAYS = 730;
const DEFAULT_STREAM_BUDGET = 80;

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function toRaw(a: IntervalsActivity): RawActivity | null {
  if (a._note || !a.start_date_local || !a.type) return null;
  return {
    id: `i${String(a.id).replace(/^i/, "")}`,
    source: "intervals",
    name: a.name ?? "Ride",
    sport_type: a.type,
    start_local: a.start_date_local.replace(/Z$/, "").slice(0, 19),
    is_trainer: a.trainer ?? a.type === "VirtualRide",
    summary: {
      distance: a.distance ?? 0,
      moving_time: a.moving_time ?? 0,
      elapsed_time: a.elapsed_time ?? a.moving_time ?? 0,
      elevation_gain: a.total_elevation_gain ?? 0,
      relative_effort: a.icu_training_load,
    },
  };
}

/** Streams come back as a list of {type, data}; reshape to what the stream processor reads. */
export function toStreams(list: IntervalsStream[]): RawStreams {
  const by = Object.fromEntries(list.map((s) => [s.type, s.data]));
  return {
    time: (by.time as number[]) ?? [],
    watts: by.watts,
    heartrate: by.heartrate,
    cadence: by.cadence,
    temp: by.temp,
  };
}

export interface IntervalsSyncResult {
  newActivities: number;
  streamsFetched: number;
}

export async function syncIntervals(streamBudget = DEFAULT_STREAM_BUDGET, now = Date.now()): Promise<IntervalsSyncResult | null> {
  if (!hasIntervalsKey()) return null;
  const existing = loadRawActivities();
  const ours = existing.filter((a) => a.source === "intervals");
  const latest = ours.reduce((max, a) => (a.start_local > max ? a.start_local : max), "");
  const oldest = latest ? isoDate(Date.parse(`${latest.slice(0, 10)}T00:00:00Z`) - 7 * 86_400_000) : isoDate(now - FIRST_SYNC_DAYS * 86_400_000);
  const list = await intervalsGet<IntervalsActivity[]>(`/athlete/0/activities?oldest=${oldest}&newest=${isoDate(now + 86_400_000)}`);

  const byId = new Map(existing.map((a) => [a.id, a]));
  let added = 0;
  for (const a of list) {
    const raw = toRaw(a);
    if (!raw) continue;
    if (!byId.has(raw.id)) added++;
    byId.set(raw.id, { ...byId.get(raw.id), ...raw });
  }
  saveRawActivities([...byId.values()].sort((a, b) => a.start_local.localeCompare(b.start_local)));

  // Download streams only for rides Strava doesn't already cover, newest first.
  const merged = [...byId.values()];
  const coveredByStrava = (a: RawActivity) =>
    merged.some(
      (s) => s.source !== "intervals" && s.sport_type.includes("Ride") && Math.abs(Date.parse(`${s.start_local}Z`) - Date.parse(`${a.start_local}Z`)) <= 120_000 && hasRideSummary(s.id),
    );
  const pending = merged
    .filter((a) => a.source === "intervals" && a.sport_type.includes("Ride") && !hasRideSummary(a.id) && !coveredByStrava(a))
    .sort((a, b) => b.start_local.localeCompare(a.start_local));
  let streamsFetched = 0;
  for (const ride of pending.slice(0, streamBudget)) {
    const streams = await intervalsGet<IntervalsStream[]>(`/activity/${ride.id.slice(1)}/streams?types=time,watts,heartrate,cadence,temp`);
    saveRideSummary(summariseStreams(ride.id, toStreams(Array.isArray(streams) ? streams : [])));
    streamsFetched++;
  }
  return { newActivities: added, streamsFetched };
}
