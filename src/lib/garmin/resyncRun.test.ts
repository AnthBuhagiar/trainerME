import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { PlannedSession } from "@/lib/plan/week";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-resync-run-"));
process.env.GARMIN_CLIENT_ID = "client";
process.env.GARMIN_CLIENT_SECRET = "secret";

// The plan as loadState would give it, changed by each test.
const plan: { sessions: PlannedSession[] } = { sessions: [] };
vi.mock("@/lib/plan/current", () => ({
  nextWeekStart: (w: string) => new Date(Date.parse(`${w}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10),
  loadState: () => ({
    today: "2026-11-05",
    thisWeekStart: "2026-11-01",
    targets: { training: 200 },
    week: (start: string) => ({ sessions: plan.sessions.filter((s) => s.date >= start && s.date < (start === "2026-11-01" ? "2026-11-08" : "2026-11-15")) }),
  }),
}));

const { getWorkout, scaleWorkout } = await import("@/lib/plan/library");
const garmin = await import("@/lib/garmin/client");
const { sendToGarmin } = await import("@/lib/garmin/send");
const { resyncGarmin, resyncSoon } = await import("@/lib/garmin/resync");

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

const calls: string[] = [];
beforeEach(() => {
  calls.length = 0;
  garmin.forgetGarmin();
  garmin.saveGarminTokens({ access_token: "tok", refresh_token: "r", expires_at: Date.now() / 1000 + 3600, userId: "g1", permissions: ["WORKOUT_IMPORT"] });
  let id = 0;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push(`${method} ${url.startsWith(garmin.GARMIN.schedule) ? "schedule" : "workout"}`);
    await new Promise((r) => setTimeout(r, 5));
    return new Response(method === "POST" && url === garmin.GARMIN.workout ? JSON.stringify({ workoutId: ++id }) : String(++id));
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("keeping Garmin up to date", () => {
  test("nothing sent yet: Garmin isn't touched", async () => {
    plan.sessions = [ride("2026-11-05")];
    expect(await resyncGarmin()).toBeNull();
    expect(calls).toEqual([]);
  });

  test("a check-in changes today's ride: only that one is replaced", async () => {
    plan.sessions = [ride("2026-11-05"), ride("2026-11-07")];
    await sendToGarmin(plan.sessions, 200);
    calls.length = 0;
    plan.sessions = [ride("2026-11-05", "endurance", 40), ride("2026-11-07")];
    expect(await resyncGarmin()).toEqual({ removed: 1, added: 1 });
    expect(calls).toEqual(["DELETE schedule", "DELETE workout", "POST workout", "POST schedule"]);
    const sent = garmin.loadSent();
    expect(sent.map((w) => w.date).sort()).toEqual(["2026-11-05", "2026-11-07"]);
    // In step now: a second run does nothing.
    calls.length = 0;
    expect(await resyncGarmin()).toBeNull();
    expect(calls).toEqual([]);
  });

  test("two changes in quick succession run one after the other, never doubling a ride", async () => {
    plan.sessions = [ride("2026-11-05")];
    await sendToGarmin(plan.sessions, 200);
    plan.sessions = [ride("2026-11-05", "endurance", 40)];
    await Promise.all([resyncSoon(), resyncSoon()]);
    expect(garmin.loadSent().filter((w) => w.date === "2026-11-05")).toHaveLength(1);
  });

  test("disconnected from Garmin: nothing happens", async () => {
    garmin.forgetGarmin();
    plan.sessions = [ride("2026-11-05")];
    expect(await resyncGarmin()).toBeNull();
  });
});
