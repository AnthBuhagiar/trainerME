import { test } from "vitest";
import { loadState, nextMonday } from "@/lib/plan/current";

test("adaptation on real data", () => {
  const s = loadState();
  const last = s.activities.filter((a) => a.sportType.includes("Ride")).map((a) => a.startLocal).sort().at(-1);
  console.log("today", s.today, "last ride", last, "note:", s.adaptation.note ?? "(none)");
  for (const m of [s.thisMonday, nextMonday(s.thisMonday)]) {
    const w = s.week(m);
    console.log(m, w.label, w.adaptation ?? "", w.sessions.map((x) => `${x.date.slice(5)} ${x.ride?.workout.name ?? x.strength?.name}`).join(" | "));
  }
});
