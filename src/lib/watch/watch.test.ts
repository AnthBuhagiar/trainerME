import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-watch-"));
process.env.TRAINERME_DATA_DIR = dir;

const { getWorkout, scaleWorkout } = await import("@/lib/plan/library");
const { ascii, watchSteps, watchToday, timeLabel, dateLabel } = await import("@/lib/watch/today");
const key = await import("@/lib/watch/key");
const store = await import("@/lib/data/store");
import type { PlannedSession } from "@/lib/plan/week";

afterAll(() => {
  delete process.env.SESSION_SECRET;
  fs.rmSync(dir, { recursive: true, force: true });
});

const ride = (date: string, id = "sweetspot-3x12", minutes = 60): PlannedSession => ({
  date,
  weekday: 4,
  start: "19:30",
  minutes,
  kind: "ride",
  indoor: true,
  ride: scaleWorkout(getWorkout(id), minutes),
  why: "",
});

const base = {
  today: "2026-11-05",
  weekStart: "2026-11-01",
  current: { hourPower: 201.4, low: 195.2, high: 207.1 },
  trainingHourPower: 201,
  weekSessions: [] as PlannedSession[],
  activities: [],
  mood: null,
  limits: () => ({ min: 35, max: 90 }),
  goal: null,
};

describe("watch steps", () => {
  test("a sweet-spot ride becomes plain steps with watts from hour power", () => {
    const steps = watchSteps(ride("2026-11-05"), 200);
    expect(steps[0].k).toBe("w");
    expect(steps.at(-1)!.k).toBe("c");
    const work = steps.filter((s) => s.k === "i");
    expect(work).toHaveLength(3);
    expect(work.every((s) => s.s === 12 * 60)).toBe(true);
    for (const s of steps) expect(s.lo).toBeLessThanOrEqual(s.hi);
    // Same total as the planned ride.
    expect(Math.round(steps.reduce((t, s) => t + s.s, 0) / 60)).toBe(ride("2026-11-05").ride!.minutes);
  });

  test("no steps without a ride or an hour power", () => {
    expect(watchSteps({ ...ride("2026-11-05"), ride: undefined, kind: "strength" }, 200)).toEqual([]);
    expect(watchSteps(ride("2026-11-05"), 0)).toEqual([]);
  });
});

describe("watch today", () => {
  test("the glance: rounded hour power, labels, the main set and its target", () => {
    const out = watchToday({ ...base, todays: [{ session: ride("2026-11-05"), done: false }] });
    expect(out.hourPower).toEqual({ w: 201, low: 195, high: 207 });
    expect(out.dateLabel).toBe("THU 5 NOV");
    expect(out.session?.title).toBe("3 x 12 min sweet spot");
    expect(out.session?.detail).toBe("3 x 12 min");
    expect(out.session?.startLabel).toBe("7:30 PM");
    expect(out.session?.target!.lo).toBeGreaterThan(150);
    expect(out.session?.minMinutes).toBe(35);
    expect(out.more).toBe(0);
  });

  test("a ride still to do leads over one already done", () => {
    const done = { ...ride("2026-11-05", "endurance", 45), start: "06:00" };
    const out = watchToday({ ...base, todays: [{ session: done, done: true }, { session: ride("2026-11-05"), done: false }] });
    expect(out.session?.start).toBe("19:30");
    expect(out.more).toBe(1);
  });

  test("the week ring counts this week's activities against the plan", () => {
    const a = (startLocal: string, movingTime: number) => ({ id: startLocal, name: "", sportType: "Ride", startLocal, isTrainer: true, distance: 0, movingTime, elapsedTime: movingTime, elevationGain: 0 });
    const out = watchToday({
      ...base,
      todays: [],
      weekSessions: [ride("2026-11-03"), ride("2026-11-05")],
      activities: [a("2026-11-03T19:30:00", 3600), a("2026-11-04T06:00:00", 1800), a("2026-10-31T07:00:00", 7200)],
    });
    expect(out.week).toEqual({ doneMin: 90, plannedMin: 120 });
    expect(out.session).toBeNull();
  });

  test("the goal: days to go and finish times", () => {
    const out = watchToday({
      ...base,
      todays: [],
      goal: { name: "GO4 Bathurst", date: "2027-04-18", daysToGo: 164, distanceKm: 147, climbingM: 2200, predictedSeconds: 5 * 3600 + 42 * 60, targetMinutes: 330 },
    });
    expect(out.goal).toMatchObject({ days: 164, km: 147, climbM: 2200, finish: "5 h 42", target: "5 h 30" });
  });

  test("labels are plain ASCII for watch fonts", () => {
    expect(ascii("3 × 12 min – Today’s · “best”…")).toBe('3 x 12 min - Today\'s - "best"...');
    expect(ascii("Café Pétanque")).toBe("Cafe Petanque");
  });

  test("labels", () => {
    expect(timeLabel("06:05")).toBe("6:05 AM");
    expect(timeLabel("12:00")).toBe("12:00 PM");
    expect(timeLabel("00:15")).toBe("12:15 AM");
    expect(dateLabel("2027-04-18")).toBe("SUN 18 APR");
  });
});

describe("watch key", () => {
  test("single rider: the key works until replaced or turned off", () => {
    const k = key.createWatchKey(null);
    expect(k).toMatch(/^me-[a-z0-9]{4}(-[a-z0-9]{4}){3}$/);
    expect(key.athleteForWatchKey(k)).toBe(0);
    expect(key.athleteForWatchKey(` ${k.toUpperCase()} `)).toBe(0);
    expect(key.athleteForWatchKey(k.slice(0, -1) + (k.endsWith("a") ? "b" : "a"))).toBeNull();
    const stored = fs.readFileSync(path.join(dir, "watch.json"), "utf8");
    expect(stored).not.toContain(k.slice(3));
    const next = key.createWatchKey(null);
    expect(key.athleteForWatchKey(k)).toBeNull();
    expect(key.athleteForWatchKey(next)).toBe(0);
    key.revokeWatchKey();
    expect(key.athleteForWatchKey(next)).toBeNull();
    expect(key.athleteForWatchKey(null)).toBeNull();
    expect(key.athleteForWatchKey("rubbish")).toBeNull();
  });

  test("hosted: each key opens only its own athlete", () => {
    process.env.SESSION_SECRET = "test-secret";
    try {
      const k1 = store.runAsAthlete(11, () => key.createWatchKey(11));
      const k2 = store.runAsAthlete(22, () => key.createWatchKey(22));
      expect(key.athleteForWatchKey(k1)).toBe(11);
      expect(key.athleteForWatchKey(k2)).toBe(22);
      // Someone else's secret under your id doesn't work.
      expect(key.athleteForWatchKey(`11-${k2.split("-").slice(1).join("-")}`)).toBeNull();
      // A single-rider key means nothing on a hosted server.
      expect(key.athleteForWatchKey(`me-${k1.split("-").slice(1).join("-")}`)).toBeNull();
    } finally {
      delete process.env.SESSION_SECRET;
    }
  });

  test("bearer header", () => {
    expect(key.bearer(new Request("https://x", { headers: { authorization: "Bearer abc" } }))).toBe("abc");
    expect(key.bearer(new Request("https://x"))).toBeNull();
  });
});
