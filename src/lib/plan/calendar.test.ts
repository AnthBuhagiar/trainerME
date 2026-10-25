import { describe, expect, test } from "vitest";
import { dateOf, dayIndex, isLastDayOfWeek, weekEndOf, weekStartOf, weekdayOf } from "@/lib/plan/calendar";

describe("training week: Sunday to Saturday", () => {
  test("every day maps to the Sunday that starts its week", () => {
    expect(weekStartOf("2026-10-25")).toBe("2026-10-25"); // Sunday
    expect(weekStartOf("2026-10-28")).toBe("2026-10-25"); // Wednesday
    expect(weekStartOf("2026-10-31")).toBe("2026-10-25"); // Saturday, the last day
    expect(weekStartOf("2026-11-01")).toBe("2026-11-01"); // next Sunday starts a new week
    expect(weekEndOf("2026-10-25")).toBe("2026-10-31");
  });

  test("weekdays (Monday = 0) land on the right dates", () => {
    expect(dayIndex(6)).toBe(0); // Sunday first
    expect(dayIndex(0)).toBe(1); // Monday
    expect(dayIndex(5)).toBe(6); // Saturday last
    expect(dateOf("2026-10-25", 2)).toBe("2026-10-28"); // Wednesday
    expect(dateOf("2026-10-25", 5)).toBe("2026-10-31"); // Saturday
    expect(weekdayOf("2026-10-31")).toBe(5);
  });

  test("Saturday is the last day of the week", () => {
    expect(isLastDayOfWeek("2026-10-31")).toBe(true);
    expect(isLastDayOfWeek("2026-11-01")).toBe(false);
  });
});
