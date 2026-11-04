import { loadRawActivities, loadSettings, readJson, saveRawActivities, saveRideSummary, writeJson, type RawActivity } from "@/lib/data/store";
import { todayLocal } from "@/lib/engine/dates";
import { retimeRidden } from "@/lib/plan/completions";
import { summariseStreams } from "@/lib/strava/process";
import type { RideSample } from "@/lib/strava/tcx";

/**
 * Keep a ride ridden in the player in Hour Power itself, whatever happens with
 * the Strava upload. When Strava's copy syncs in later, the two are one ride
 * (dedupeActivities) and Strava's is shown.
 */
export function keepRide(name: string, startMs: number, samples: RideSample[]): RawActivity {
  const id = `hp-${startMs}`;
  const seconds = samples.length ? samples[samples.length - 1].t + 1 : 0;
  const activity: RawActivity = {
    id,
    source: "hourpower",
    name,
    sport_type: "VirtualRide",
    start_local: todayLocal(loadSettings().timeZone ?? process.env.APP_TIMEZONE, new Date(startMs)),
    is_trainer: true,
    summary: { distance: 0, moving_time: seconds, elapsed_time: seconds, elevation_gain: 0 },
  };
  saveRideSummary(
    summariseStreams(id, {
      time: samples.map((s) => s.t),
      watts: samples.map((s) => s.power ?? null),
      heartrate: samples.map((s) => s.hr ?? null),
      cadence: samples.map((s) => s.cadence ?? null),
    }),
  );
  // Every second, for downloading the ride later (a .fit for Garmin Connect).
  writeJson(samplesFile(id), samples);
  saveRawActivities([...loadRawActivities().filter((a) => a.id !== id), activity].sort((a, b) => a.start_local.localeCompare(b.start_local)));
  return activity;
}

const samplesFile = (id: string) => `samples/${id}.json`;

/** The seconds of a ride ridden in the player, if kept. */
export function keptSamples(id: string): RideSample[] | null {
  return /^hp-\d+$/.test(id) ? readJson<RideSample[] | null>(samplesFile(id), null) : null;
}

/**
 * Re-time the rides kept by Hour Power for this zone (their ids hold the start
 * in UTC), and the sessions they did along with them, after the rider's zone
 * was missing or wrong when they were saved.
 */
export function relocalizeKeptRides(zone: string): number {
  const raw = loadRawActivities();
  const moved = new Map<string, string>();
  const next = raw.map((a) => {
    const ms = /^hp-(\d+)$/.exec(a.id)?.[1];
    if (a.source !== "hourpower" || !ms) return a;
    const local = todayLocal(zone, new Date(Number(ms)));
    if (local === a.start_local) return a;
    moved.set(a.start_local, local);
    return { ...a, start_local: local };
  });
  if (!moved.size) return 0;
  saveRawActivities(next.sort((a, b) => a.start_local.localeCompare(b.start_local)));
  retimeRidden(moved);
  return moved.size;
}
