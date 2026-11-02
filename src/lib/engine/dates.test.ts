import { describe, expect, test } from "vitest";
import { addDays, daysBetween, todayLocal, wallClockMs, zoneFromStrava } from "@/lib/engine/dates";

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

describe("date maths ignores the server's own time zone", () => {
  test("the suite really runs away from UTC", () => {
    // vitest.config.ts sets TZ=Australia/Sydney so zone leaks show up here.
    expect(new Date("2026-11-03T00:00:00").getTimezoneOffset()).toBe(-660);
  });

  test("adding days keeps the wall-clock time", () => {
    expect(addDays("2026-10-19T19:30:00", 3)).toBe("2026-10-22T19:30:00");
    expect(addDays("2026-10-19T05:00:00", -7)).toBe("2026-10-12T05:00:00");
    expect(addDays("2026-10-19", 1)).toBe("2026-10-20T00:00:00");
  });

  test("daylight saving changes never shift a day", () => {
    // Sydney clocks went forward on Sunday 4 Oct 2026; the gap is still exactly 7 days.
    expect(daysBetween("2026-10-01T06:00:00", "2026-10-08T06:00:00")).toBe(7);
    expect(addDays("2026-10-01T06:00:00", 7)).toBe("2026-10-08T06:00:00");
  });

  test("strings that carry a zone are respected", () => {
    expect(wallClockMs("2026-11-03T00:00:00Z")).toBe(Date.UTC(2026, 10, 3));
    expect(wallClockMs("2026-11-03T11:00:00+11:00")).toBe(Date.UTC(2026, 10, 3));
    expect(wallClockMs("2026-11-03")).toBe(Date.UTC(2026, 10, 3));
  });
});
