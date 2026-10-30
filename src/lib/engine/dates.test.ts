import { describe, expect, test } from "vitest";
import { todayLocal, zoneFromStrava } from "@/lib/engine/dates";

describe("today, in the rider's time zone", () => {
  // 7:00 pm UTC on Friday 30 Oct is 6:00 am Saturday 31 Oct in Sydney (daylight saving, UTC+11).
  const now = new Date("2026-10-30T19:00:00Z");

  test("a Sydney rider's morning is already tomorrow on a UTC server", () => {
    expect(todayLocal("Australia/Sydney", now)).toBe("2026-10-31T06:00:00");
    expect(todayLocal("Europe/London", now)).toBe("2026-10-30T19:00:00");
  });

  test("an unknown zone falls back to the server's clock", () => {
    expect(todayLocal("Not/AZone", now)).toMatch(/^2026-10-(30|31)T/);
  });

  test("reads the zone from Strava's format", () => {
    expect(zoneFromStrava("(GMT+10:00) Australia/Sydney")).toBe("Australia/Sydney");
    expect(zoneFromStrava("(GMT+00:00) Etc/Nowhere")).toBeUndefined();
    expect(zoneFromStrava(undefined)).toBeUndefined();
  });
});
