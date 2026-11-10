import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-garmin-"));
process.env.GARMIN_CLIENT_ID = "client";
process.env.GARMIN_CLIENT_SECRET = "secret";
const { getWorkout, scaleWorkout } = await import("@/lib/plan/library");
const { toGarminWorkout } = await import("@/lib/garmin/workout");
const garmin = await import("@/lib/garmin/client");
const { sendToGarmin, sendState } = await import("@/lib/garmin/send");
const store = await import("@/lib/data/store");
import type { PlannedSession } from "@/lib/plan/week";
import type { GarminRepeat, GarminStep } from "@/lib/garmin/workout";

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const ride = (date: string, id = "threshold-2x15", minutes = 60): PlannedSession => ({
  date,
  weekday: 2,
  start: "19:30",
  minutes,
  kind: "ride",
  indoor: true,
  ride: scaleWorkout(getWorkout(id), minutes),
  why: "",
});
const flat = (steps: (GarminStep | GarminRepeat)[]) => steps.flatMap((s) => (s.type === "WorkoutRepeatStep" ? [s, ...s.steps] : [s]));

describe("Garmin workout", () => {
  test("threshold session: watt ranges, repeats written out as plain steps", () => {
    const w = toGarminWorkout(ride("2026-10-21"), 181);
    expect(w).toMatchObject({ sport: "CYCLING", workoutName: "2 × 15 min threshold", workoutProvider: "Hour Power" });
    const steps = w.segments[0].steps;
    expect(steps[0]).toMatchObject({ intensity: "WARMUP", durationValue: 17 * 60, targetType: "POWER", targetValueLow: 91, targetValueHigh: 118 });
    // Threshold (97–102% of hour power) goes out widened to ±5% around its middle, so alerts mean the effort is off.
    // Garmin's V2 API refuses REPEAT_UNTIL_STEPS_CMPLTD: no repeat steps when the workout fits.
    expect(steps.some((s) => s.type === "WorkoutRepeatStep")).toBe(false);
    expect(steps.slice(1, 5).map((s) => [(s as GarminStep).intensity, (s as GarminStep).durationValue, (s as GarminStep).targetValueLow, (s as GarminStep).targetValueHigh, (s as GarminStep).description])).toEqual([
      ["INTERVAL", 900, 171, 189, "Rep 1 of 2"],
      ["RECOVERY", 300, 91, 118, "Easy"],
      ["INTERVAL", 900, 171, 189, "Rep 2 of 2"],
      ["RECOVERY", 300, 91, 118, "Easy"],
    ]);
    expect(steps.at(-1)).toMatchObject({ intensity: "COOLDOWN" });
    expect(w.estimatedDurationInSecs).toBe(17 * 60 + 2 * 20 * 60 + 8 * 60);
    // Step numbers run 1, 2, 3… through repeats too.
    expect(flat(steps).map((s) => s.stepOrder)).toEqual(flat(steps).map((_, i) => i + 1));
  });

  test("a workout over Garmin's step limit keeps the repeat form", () => {
    const steps = toGarminWorkout(ride("2026-10-21", "vo2-30-15"), 200).segments[0].steps;
    expect(steps.filter((s) => s.type === "WorkoutRepeatStep").map((s) => (s as GarminRepeat).repeatValue)).toEqual([13, 13, 13]);
    expect(steps.filter((s) => s.type === "WorkoutStep" && s.description === "Easy between sets")).toHaveLength(2);
  });

  test("every workout that fits is sent as plain steps", async () => {
    const { LIBRARY } = await import("@/lib/plan/library");
    const { MAX_STEPS } = await import("@/lib/garmin/workout");
    for (const w of LIBRARY) {
      const steps = toGarminWorkout(ride("2026-10-21", w.id, Math.max(w.minMinutes, 60)), 200).segments[0].steps;
      const hasRepeat = steps.some((s) => s.type === "WorkoutRepeatStep");
      expect(hasRepeat ? flat(steps).length > 0 : steps.length <= MAX_STEPS).toBe(true);
      if (hasRepeat) expect(steps.length).toBeLessThanOrEqual(MAX_STEPS);
    }
  });

  test("long rides put the efforts late", () => {
    const steps = toGarminWorkout(ride("2026-10-25", "long-ride-late-efforts", 180), 180).segments[0].steps;
    const steady = steps.findIndex((s) => s.type === "WorkoutStep" && s.intensity === "ACTIVE");
    const work = steps.findIndex((s) => s.type === "WorkoutRepeatStep" || s.intensity === "INTERVAL");
    expect(steady).toBeGreaterThan(0);
    expect(steady).toBeLessThan(work);
  });
});

describe("Garmin sign-in", () => {
  test("PKCE challenge is the verifier's SHA-256", () => {
    const { verifier, challenge } = garmin.pkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(challenge).toBe(crypto.createHash("sha256").update(verifier).digest("base64url"));
    const url = new URL(garmin.authorizeUrl("st", challenge));
    expect(url.origin + url.pathname).toBe(garmin.GARMIN.authorize);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: "client", state: "st", code_challenge: challenge, code_challenge_method: "S256", response_type: "code" });
  });

  test("workouts can be sent only when the rider allowed them", () => {
    const base = { access_token: "a", refresh_token: "r", expires_at: 0 };
    expect(garmin.canSendWorkouts({ ...base, permissions: ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"] })).toBe(true);
    expect(garmin.canSendWorkouts({ ...base, permissions: ["ACTIVITY_EXPORT"] })).toBe(false);
    expect(garmin.canSendWorkouts(null)).toBe(false);
  });

  test("Garmin's permissions in any shape never break the app", () => {
    const base = { access_token: "a", refresh_token: "r", expires_at: 0 };
    expect(garmin.permissionList({ permissions: ["WORKOUT_IMPORT", 3] })).toEqual(["WORKOUT_IMPORT"]);
    expect(garmin.permissionList("WORKOUT_IMPORT")).toBeUndefined();
    expect(garmin.permissionList(null)).toBeUndefined();
    // Saved by the first version straight from Garmin's reply: an object, not a list.
    for (const saved of [{ permissions: ["WORKOUT_IMPORT"] }, {}, "x", 7]) {
      expect(garmin.canSendWorkouts({ ...base, permissions: saved as unknown as string[] })).toBe(true);
    }
    expect(garmin.canSendWorkouts({ ...base, permissions: { permissions: ["ACTIVITY_EXPORT"] } as unknown as string[] })).toBe(false);
  });

  test("connecting reads permissions sent as an object", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url === garmin.GARMIN.token) return new Response(JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 86_400 }));
      if (url === garmin.GARMIN.userId) return new Response(JSON.stringify({ userId: "g9" }));
      return new Response(JSON.stringify({ permissions: ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"] }));
    });
    const tokens = await garmin.exchangeCode("code", "verifier");
    expect(tokens).toMatchObject({ userId: "g9", permissions: ["ACTIVITY_EXPORT", "WORKOUT_IMPORT"] });
    vi.unstubAllGlobals();
  });
});

describe("sending to Garmin", () => {
  const calls: { url: string; method: string; body?: string; auth?: string }[] = [];
  let nextId = 100;
  beforeEach(() => {
    calls.length = 0;
    garmin.forgetGarmin();
    garmin.saveGarminTokens({ access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, userId: "g1", permissions: ["WORKOUT_IMPORT"] });
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body as string, auth: (init.headers as Record<string, string>).Authorization });
      if (init.method === "POST" && url === garmin.GARMIN.workout) return new Response(JSON.stringify({ workoutId: ++nextId }));
      if (init.method === "POST" && url === garmin.GARMIN.schedule) return new Response(String(++nextId));
      return new Response("");
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  test("creates the workout, then schedules it on the day", async () => {
    expect(await sendToGarmin([ride(day(1)), { ...ride(day(2)), kind: "strength", ride: undefined }], 181)).toEqual({ sent: 1, replaced: 0 });
    expect(calls.map((c) => [c.method, c.url])).toEqual([
      ["POST", garmin.GARMIN.workout],
      ["POST", garmin.GARMIN.schedule],
    ]);
    expect(calls[0].auth).toBe("Bearer tok");
    expect(JSON.parse(calls[1].body!)).toEqual({ workoutId: 101, date: day(1) });
    expect(garmin.loadSent()).toEqual([{ key: `${day(1)} 19:30`, date: day(1), workoutId: 101, scheduleId: 102, fingerprint: expect.stringMatching(/^[0-9a-f]{16}$/), planFingerprint: expect.stringMatching(/^[0-9a-f]{16}$/) }]);
  });

  test("sending again replaces what Hour Power sent, nothing else", async () => {
    await sendToGarmin([ride(day(1)), ride(day(3))], 181);
    calls.length = 0;
    // The plan changed: day 3's ride is gone, day 1's is still there.
    const result = await sendToGarmin([ride(day(1))], 185, { oldest: day(0), newest: day(13) });
    expect(result).toEqual({ sent: 1, replaced: 2 });
    const deletes = calls.filter((c) => c.method === "DELETE").map((c) => c.url);
    expect(deletes).toHaveLength(4); // a schedule and a workout for each
    expect(deletes.every((u) => u.startsWith(garmin.GARMIN.schedule) || u.startsWith(garmin.GARMIN.workout))).toBe(true);
    expect(garmin.loadSent().map((w) => w.date)).toEqual([day(1)]);
  });

  test("knows when the rides are on Garmin as planned, and when the plan changed since", async () => {
    const week = [ride(day(1)), ride(day(3))];
    expect(sendState(week, 181)).toBe("unsent");
    await sendToGarmin(week, 181);
    expect(sendState(week, 181)).toBe("sent");
    expect(sendState(week, 190)).toBe("changed"); // new hour power: new targets
    expect(sendState([ride(day(1)), ride(day(3), "threshold-2x15", 45)], 181)).toBe("changed"); // shortened
    expect(sendState([...week, ride(day(5))], 181)).toBe("changed"); // a ride added
    expect(sendState([ride(day(9))], 181)).toBe("unsent");
    // Sent by the first version, before fingerprints: counted as sent.
    garmin.saveSent(garmin.loadSent().map((w) => ({ ...w, fingerprint: undefined, planFingerprint: undefined })));
    expect(sendState(week, 190)).toBe("sent");
  });

  test("a workout the rider already deleted on Garmin doesn't stop the send", async () => {
    await sendToGarmin([ride(day(1))], 181);
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      if (init.method === "DELETE") return new Response("gone", { status: 404 });
      if (url === garmin.GARMIN.workout) return new Response(JSON.stringify({ workoutId: 900 }));
      return new Response("901");
    });
    expect(await sendToGarmin([ride(day(1))], 181)).toEqual({ sent: 1, replaced: 1 });
    expect(garmin.loadSent()).toEqual([expect.objectContaining({ workoutId: 900, scheduleId: 901 })]);
  });

  test("an expired access token is refreshed first", async () => {
    garmin.saveGarminTokens({ access_token: "old", refresh_token: "r1", expires_at: 0, userId: "g1" });
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      if (url === garmin.GARMIN.token) {
        seen.push(String(init.body));
        return new Response(JSON.stringify({ access_token: "new", refresh_token: "r2", expires_in: 86_400 }));
      }
      seen.push((init.headers as Record<string, string>).Authorization);
      return new Response(url === garmin.GARMIN.workout ? JSON.stringify({ workoutId: 1 }) : "2");
    });
    await sendToGarmin([ride(day(1))], 181);
    expect(seen[0]).toContain("grant_type=refresh_token");
    expect(seen[0]).toContain("refresh_token=r1");
    expect(seen.slice(1)).toEqual(["Bearer new", "Bearer new"]);
    expect(garmin.loadGarminTokens()).toMatchObject({ access_token: "new", refresh_token: "r2", userId: "g1" });
  });
});

describe("Garmin notifications", () => {
  afterEach(() => vi.unstubAllGlobals());
  const ping = (body: unknown) => new NextRequest("https://example.test/api/garmin/webhook", { method: "POST", body: JSON.stringify(body) });
  const tokensFile = () => path.join(store.dataDir(), "garmin-tokens.json");

  test("a deregistration is acted on only once Garmin refuses the tokens", async () => {
    const { POST } = await import("@/app/api/garmin/webhook/route");
    garmin.saveGarminTokens({ access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, userId: "g1" });
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ userId: "g1" })));
    await POST(ping({ deregistrations: [{ userId: "g1" }] }));
    expect(fs.existsSync(tokensFile())).toBe(true); // still connected: a forged ping does nothing

    vi.stubGlobal("fetch", async () => new Response("", { status: 401 }));
    await POST(ping({ deregistrations: [{ userId: "someone-else" }] }));
    expect(fs.existsSync(tokensFile())).toBe(true);
    await POST(ping({ deregistrations: [{ userId: "g1" }] }));
    expect(fs.existsSync(tokensFile())).toBe(false);
  });

  test("a Garmin error reply never reaches the log or the error message", async () => {
    garmin.saveGarminTokens({ access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, userId: "g1" });
    const personal = JSON.stringify({ errorCode: "INVALID_WORKOUT", userEmail: "rider@example.test", userProfile: { name: "Synthetic Rider", weight: 77 } });
    vi.stubGlobal("fetch", async () => new Response(personal, { status: 400 }));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = await garmin.garminCall("https://apis.garmin.com/workoutportal/workout/v2").catch((e: Error) => e);
    const all = `${JSON.stringify(logged.mock.calls)} ${(error as Error).message}`;
    expect(all).toContain("INVALID_WORKOUT"); // the error code is kept
    for (const leak of ["rider@example.test", "Synthetic Rider", "77"]) expect(all).not.toContain(leak);
    expect(garmin.garminErrorSummary("<html>Bad gateway for rider@example.test</html>")).toBe("");
    expect(garmin.garminErrorSummary(JSON.stringify({ message: "contact rider@example.test" }))).toBe("");
    logged.mockRestore();
  });

    test("a permission change updates what the buttons offer", async () => {
    const { POST } = await import("@/app/api/garmin/webhook/route");
    garmin.saveGarminTokens({ access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, userId: "g1", permissions: ["WORKOUT_IMPORT"] });
    await POST(ping({ userPermissionsChange: [{ userId: "g1", permissions: ["ACTIVITY_EXPORT"] }] }));
    expect(garmin.canSendWorkouts()).toBe(false);
  });
});
