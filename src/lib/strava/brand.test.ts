import { afterEach, describe, expect, it } from "vitest";
import { brandLine, withBrand } from "@/lib/strava/brandLine";
import { ridesToBrand } from "@/lib/strava/brand";
import type { Activity } from "@/lib/types";

const ride = (id: string, startLocal: string): Activity => ({ id, name: "Evening ride", sportType: "Ride", startLocal, isTrainer: true, distance: 0, movingTime: 3600, elapsedTime: 3600, elevationGain: 0 });

describe("Hour Power line on Strava", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it("names the workout, with the app's address only when hosted", () => {
    delete process.env.SESSION_SECRET;
    expect(brandLine("Threshold 3×12")).toBe("⚡ Hour Power workout: Threshold 3×12");
    process.env.SESSION_SECRET = "x";
    process.env.APP_URL = "https://hourpowerapp.cc";
    expect(brandLine("Threshold 3×12")).toBe("⚡ Hour Power workout: Threshold 3×12 · hourpowerapp.cc");
    expect(brandLine("Strength A", "gym session")).toBe("⚡ Hour Power gym session: Strength A · hourpowerapp.cc");
  });

  it("adds one line under what the rider wrote, and never twice", () => {
    expect(withBrand(null, "⚡ Hour Power workout: X")).toBe("⚡ Hour Power workout: X");
    expect(withBrand("Legs felt good", "⚡ Hour Power workout: X")).toBe("Legs felt good\n\n⚡ Hour Power workout: X");
    expect(withBrand("Legs felt good\n\n⚡ Hour Power workout: X", "⚡ Hour Power workout: X")).toBeNull();
  });

  it("only tags fresh Strava rides of sessions sent to Garmin, once", () => {
    const found = [
      { activity: ride("111", "2026-11-11T18:00:00"), title: "Threshold 3×12", key: "2026-11-11 18:00" }, // sent: tagged
      { activity: ride("222", "2026-11-11T07:00:00"), title: "Endurance", key: "2026-11-11 07:00" }, // not sent to Garmin
      { activity: ride("hp-1", "2026-11-12T18:00:00"), title: "VO2 5×3", key: "2026-11-12 18:00" }, // Hour Power's own ride
      { activity: ride("333", "2026-11-01T18:00:00"), title: "Sweet spot", key: "2026-11-01 18:00" }, // too old
      { activity: ride("444", "2026-11-10T18:00:00"), title: "Tempo", key: "2026-11-10 18:00" }, // already done
    ];
    const sent = new Set(["2026-11-11 18:00", "2026-11-12 18:00", "2026-11-01 18:00", "2026-11-10 18:00"]);
    expect(ridesToBrand(found, sent, new Set(["444"]), "2026-11-12")).toEqual([{ id: "111", title: "Threshold 3×12" }]);
  });
});
