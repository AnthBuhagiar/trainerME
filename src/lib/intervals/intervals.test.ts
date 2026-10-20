import { afterEach, describe, expect, test, vi } from "vitest";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { duration, workoutText } from "@/lib/intervals/workoutText";
import { sendSessions } from "@/lib/intervals/client";
import type { PlannedSession } from "@/lib/plan/week";

describe("Intervals.icu workout text", () => {
  test("durations", () => {
    expect(duration(30)).toBe("30s");
    expect(duration(900)).toBe("15m");
    expect(duration(90)).toBe("1m30s");
  });

  test("threshold session with watt targets", () => {
    expect(workoutText(getWorkout("threshold-2x15"), 181)).toBe(
      ["Warmup\n- 17m 91-118w", "Main set 2x\n- 15m 176-185w\n- 5m 91-118w", "Cooldown\n- 8m 91-118w"].join("\n\n"),
    );
  });

  test("multi-set sessions write each set with easy riding between", () => {
    const text = workoutText(getWorkout("vo2-30-15"), 200);
    expect(text.match(/Set \d 13x/g)).toHaveLength(3);
    expect(text.match(/^Easy$/gm)).toHaveLength(2);
    expect(text).toContain("- 30s 240-270w");
  });

  test("long rides put the efforts late", () => {
    const text = workoutText(scaleWorkout(getWorkout("long-ride-late-efforts"), 180).workout, 180);
    expect(text.indexOf("Steady")).toBeLessThan(text.indexOf("Main set"));
  });
});

describe("sending to Intervals.icu", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("replaces only Hour Power's events, then creates the plan", async () => {
    process.env.INTERVALS_API_KEY = "test-key";
    const calls: { url: string; method: string; body?: string; auth?: string }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
      calls.push({ url, method: init.method ?? "GET", body: init.body as string, auth: (init.headers as Record<string, string>).Authorization });
      if (url.includes("/events?")) {
        return new Response(
          JSON.stringify([
            { id: 1, external_id: "hourpower-2026-10-21-1930", start_date_local: "2026-10-21T19:30:00" },
            { id: 2, external_id: null, description: "Club ride", start_date_local: "2026-10-22T06:00:00" },
          ]),
        );
      }
      return new Response("[]");
    });
    const ride = scaleWorkout(getWorkout("threshold-2x15"), 60);
    const sessions: PlannedSession[] = [
      { date: "2026-10-21", weekday: 2, start: "19:30", minutes: 60, kind: "ride", indoor: true, ride, why: "" },
      { date: "2026-10-23", weekday: 4, start: "19:45", minutes: 55, kind: "strength", indoor: true, why: "" },
    ];
    const result = await sendSessions(sessions, 181, "2026-10-20", "2026-11-01");
    expect(result).toEqual({ sent: 1, replaced: 1 });
    expect(calls.map((c) => c.method)).toEqual(["GET", "DELETE", "POST"]);
    expect(calls[1].url).toMatch(/\/events\/1$/);
    expect(calls[0].auth).toBe(`Basic ${Buffer.from("API_KEY:test-key").toString("base64")}`);
    const [event] = JSON.parse(calls[2].body!);
    expect(event).toMatchObject({ category: "WORKOUT", type: "VirtualRide", start_date_local: "2026-10-21T19:30:00", external_id: "hourpower-2026-10-21-1930" });
    expect(event.description).toContain("- 15m 176-185w");
  });
});
