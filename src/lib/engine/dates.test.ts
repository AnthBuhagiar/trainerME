import { describe, expect, test } from "vitest";
import { addDays, daysBetween, todayLocal, zoneFromStrava } from "@/lib/engine/dates";

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

describe("local time to UTC", () => {
  test("uses the zone's offset on that date, daylight saving included", async () => {
    const { localToUtc } = await import("@/lib/engine/dates");
    expect(new Date(localToUtc("2026-11-04T19:30:00", "Australia/Sydney")).toISOString()).toBe("2026-11-04T08:30:00.000Z"); // AEDT, +11
    expect(new Date(localToUtc("2026-07-04T19:30:00", "Australia/Sydney")).toISOString()).toBe("2026-07-04T09:30:00.000Z"); // AEST, +10
  });
});

describe("day maths doesn't depend on the server's time zone", () => {
  // Node re-reads TZ when it changes, so each zone is tried in this one process.
  const zones = ["UTC", "Australia/Sydney", "America/Los_Angeles"];
  const original = process.env.TZ;

  test.each(zones)("in %s", (zone) => {
    process.env.TZ = zone;
    try {
      expect(addDays("2026-10-19T00:00:00", 3)).toBe("2026-10-22T00:00:00");
      expect(addDays("2026-10-19T00:00:00", -7)).toBe("2026-10-12T00:00:00");
      expect(addDays("2026-10-03T19:30:00", 1)).toBe("2026-10-04T19:30:00"); // across Sydney's daylight-saving change
      expect(addDays("2026-11-09", 1)).toBe("2026-11-10T00:00:00");
      expect(daysBetween("2026-10-15T19:30:00", "2026-10-20T12:00:00")).toBe(4.6875);
      expect(daysBetween("2026-10-03T12:00:00", "2026-10-05T12:00:00")).toBe(2);
      expect(daysBetween("2026-11-09T00:00:00Z", "2026-11-10T00:00:00Z")).toBe(1);
    } finally {
      process.env.TZ = original;
    }
  });
});
