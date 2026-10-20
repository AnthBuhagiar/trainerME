import { test } from "vitest";
import { loadRides } from "@/lib/data/store";
import { buildModel } from "@/lib/engine/hourPower";
import { buildHistory } from "@/lib/engine/history";

test("inspect", () => {
  const rides = loadRides();
  const model = buildModel(rides);
  const h = buildHistory(model, "2026-10-20T12:00:00");
  console.log("rides", rides.length, "withStreams", model.rides.length, "refHr", model.refHr, "effs", model.efficiencies.length, "calib", model.calibration.length);
  const c = h.current!;
  console.log("current", Math.round(c.hourPower), Math.round(c.low), Math.round(c.high), "cp", c.cp && { cp: Math.round(c.cp.cp), w: Math.round(c.cp.wPrime), hp: Math.round(c.cp.hourPower), s: c.cp.sigma.toFixed(1), age: c.cp.evidenceAgeDays.toFixed(0), used: c.cp.used.map(u=>u.duration+":"+Math.round(u.power)) }, "hr", c.hr && { hp: Math.round(c.hr.hourPower), s: c.hr.sigma.toFixed(1), snaps: c.hr.snapshots.map(s=>`${s.indoor?'in':'out'} ${s.power.toFixed(0)}W r=${s.ratio.toFixed(2)} n=${s.rides}`) }, "dur", c.durability);
  for (const p of h.points.filter((_, i) => i % 6 === 0)) console.log(p.date.slice(0,10), Math.round(p.hourPower), Math.round(p.low), Math.round(p.high));
  for (const l of h.ledger.slice(0, 12)) console.log(l.date.slice(0,10), l.rideName, l.delta.toFixed(1), l.decay.toFixed(1), l.reasons.join(" | "));
});
