import { describe, expect, it } from "vitest";
import { dedupeActivities, type RawActivity } from "@/lib/data/store";
import { keptRideId } from "@/lib/strava/sync";

const act = (id: string, source: RawActivity["source"], start: string, moving: number, extra: Partial<RawActivity> = {}): RawActivity => ({
  id,
  source,
  name: "Threshold 3×12",
  sport_type: "VirtualRide",
  start_local: start,
  is_trainer: true,
  summary: { distance: 0, moving_time: moving, elapsed_time: moving, elevation_gain: 0 },
  ...extra,
});

describe("one ride ridden in Hour Power and uploaded to Strava", () => {
  const hp = act("hp-1762941600000", "hourpower", "2026-11-12T18:00:00", 3600);

  it("reads which kept ride Strava's copy came from", () => {
    expect(keptRideId("hourpower-1762941600000")).toBe("hp-1762941600000");
    expect(keptRideId("hourpower-1762941600000.tcx")).toBe("hp-1762941600000");
    expect(keptRideId("garmin_push_123")).toBeUndefined();
    expect(keptRideId(null)).toBeUndefined();
  });

  it("is one ride even when Strava's start is hours off (another time zone)", () => {
    const strava = act("999", "strava", "2026-11-12T07:00:00", 3600, { kept_ride: hp.id });
    const out = dedupeActivities([hp, strava], () => false);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("999"); // no streams either way: Strava's
  });

  it("keeps the copy with streams until Strava's streams arrive", () => {
    const strava = act("999", "strava", "2026-11-12T18:00:00", 3600, { kept_ride: hp.id });
    expect(dedupeActivities([hp, strava], (id) => id === hp.id).map((a) => a.id)).toEqual([hp.id]);
    expect(dedupeActivities([hp, strava], () => true).map((a) => a.id)).toEqual(["999"]);
  });

  it("is one ride when Strava counts much less moving time (stops on the trainer)", () => {
    const strava = act("999", "strava", "2026-11-12T18:00:30", 2400);
    expect(dedupeActivities([hp, strava], () => false)).toHaveLength(1);
  });

  it("still keeps two different Strava rides apart", () => {
    const a = act("1", "strava", "2026-11-12T18:00:00", 3600);
    const b = act("2", "strava", "2026-11-12T18:01:00", 1200);
    expect(dedupeActivities([a, b], () => false)).toHaveLength(2);
  });
});
