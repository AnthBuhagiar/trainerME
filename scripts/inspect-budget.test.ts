import { test } from "vitest";
import { loadActivities } from "@/lib/data/store";
import { describeSlot, inferTimeBudget } from "@/lib/plan/timeBudget";

test("inspect budget", () => {
  const b = inferTimeBudget(loadActivities(), "2026-10-20T12:00:00");
  for (const s of b.slots) console.log(describeSlot(s), "freq", s.frequency, "indoor", s.indoorShare.toFixed(2));
  console.log("total min", b.totalMinutes);
});
