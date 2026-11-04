import { loadRawActivities, loadSettings, saveRawActivities, saveRideSummary, type RawActivity } from "@/lib/data/store";
import { todayLocal } from "@/lib/engine/dates";
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
  saveRawActivities([...loadRawActivities().filter((a) => a.id !== id), activity].sort((a, b) => a.start_local.localeCompare(b.start_local)));
  return activity;
}
