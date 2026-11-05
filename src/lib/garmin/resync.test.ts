import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-resync-"));
process.env.GARMIN_CLIENT_ID = "client";
process.env.GARMIN_CLIENT_SECRET = "secret";
const { getWorkout, scaleWorkout } = await import("@/lib/plan/library");
const garmin = await import("@/lib/garmin/client");
const { sendToGarmin, sendState, workoutFingerprint } = await import("@/lib/garmin/send");
const { garminChanges } = await import("@/lib/garmin/resync");
import type { PlannedSession } from "@/lib/plan/week";
import type { SentWorkout } from "@/lib/garmin/client";

const today = "2026-11-05";
const newest = "2026-11-14";
const ride = (date: string, id = "sweetspot-3x12", minutes = 60, start = "19:30"): PlannedSession => ({
  date,
  weekday: 4,
  start,
  minutes,
  kind: "ride",
  indoor: true,
  ride: scaleWorkout(getWorkout(id), minutes),
  why: "",
});
const sentFor = (s: PlannedSession, hp = 200, id = 1): SentWorkout => ({
  key: `${s.date} ${s.start}`,
  date: s.date,
  workoutId: id,
  scheduleId: id + 1000,
  fingerprint: workoutFingerprint(s, hp),
  planFingerprint: workoutFingerprint(s, hp),
});
const week = [ride("2026-11-05"), ride("2026-11-07", "endurance", 90), ride("2026-11-10")];
const sentWeek = week.map((s, i) => sentFor(s, 200, i + 1));
const changes = (sessions: PlannedSession[], sent = sentWeek, hp = 200) => garminChanges(sessions, hp, sent, today, newest);

describe("what to change on Garmin after the plan changes", () => {
  test("nothing sent, or nothing changed: nothing to do", () => {
    expect(changes(week, [])).toEqual({ remove: [], add: [] });
    expect(changes(week)).toEqual({ remove: [], add: [] });
  });

  test("a tired check-in: that day's ride is replaced, the rest left alone", () => {
    const tired = [{ ...ride("2026-11-05", "endurance", 40), adjusted: "Tired" }, week[1], week[2]];
    const c = changes(tired);
    expect(c.remove.map((w) => w.workoutId)).toEqual([1]);
    expect(c.add).toEqual([tired[0]]);
  });

  test("a day off: the ride moves to the next free day", () => {
    const moved = [{ ...week[0], date: "2026-11-06", movedFrom: "2026-11-05" }, week[1], week[2]];
    const c = changes(moved);
    expect(c.remove.map((w) => w.date)).toEqual(["2026-11-05"]);
    expect(c.add.map((s) => s.date)).toEqual(["2026-11-06"]);
  });

  test("a ride taken out comes off Garmin", () => {
    const c = changes([week[0], week[2]]);
    expect(c.remove.map((w) => w.date)).toEqual(["2026-11-07"]);
    expect(c.add).toEqual([]);
  });

  test("new targets: every sent ride goes back on with the new watts", () => {
    const c = changes(week, sentWeek, 210);
    expect(c.remove).toHaveLength(3);
    expect(c.add).toHaveLength(3);
  });

  test("only the days that were sent: one ride sent doesn't send the fortnight", () => {
    const one = [sentFor(week[0])];
    expect(changes(week, one)).toEqual({ remove: [], add: [] });
    const c = changes([{ ...week[0], minutes: 45, ride: scaleWorkout(getWorkout("sweetspot-3x12"), 45) }, week[1], week[2]], one);
    expect(c.add.map((s) => s.date)).toEqual(["2026-11-05"]);
  });

  test("past days are left alone", () => {
    const past = [sentFor(ride("2026-11-03")), ...sentWeek];
    expect(changes(week, past)).toEqual({ remove: [], add: [] });
  });

  test("a ride sent at another length stays as sent while the plan hasn't changed", () => {
    const planned = week[0];
    const shorter = ride("2026-11-05", "sweetspot-3x12", 40);
    const custom = { ...sentFor(shorter), planFingerprint: workoutFingerprint(planned, 200) };
    expect(changes([planned], [custom])).toEqual({ remove: [], add: [] });
    // Then a check-in changes the planned session: the plan wins.
    const tired = ride("2026-11-05", "endurance", 40);
    expect(changes([tired], [custom]).remove).toEqual([custom]);
  });

  test("sent before fingerprints were kept: trusted as planned", () => {
    const old = sentWeek.map((w) => ({ ...w, fingerprint: undefined, planFingerprint: undefined }));
    expect(changes(week, old, 999)).toEqual({ remove: [], add: [] });
  });
});

describe("sending one ride at another length", () => {
  beforeEach(() => {
    garmin.forgetGarmin();
    garmin.saveGarminTokens({ access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, userId: "g1", permissions: ["WORKOUT_IMPORT"] });
    let id = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) =>
      new Response(init.method === "POST" && url === garmin.GARMIN.workout ? JSON.stringify({ workoutId: ++id }) : String(++id)),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  test("records the planned session, so it reads as sent", async () => {
    const planned = ride("2026-11-05");
    const shorter = ride("2026-11-05", "sweetspot-3x12", 40);
    await sendToGarmin([shorter], 200, undefined, planned);
    const [w] = garmin.loadSent();
    expect(w.planFingerprint).toBe(workoutFingerprint(planned, 200));
    expect(w.fingerprint).toBe(workoutFingerprint(shorter, 200));
    expect(sendState([planned], 200)).toBe("sent");
  });
});
