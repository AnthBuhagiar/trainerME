import { test } from "vitest";
import { loadRides } from "@/lib/data/store";
import { backtest } from "@/lib/engine/backtest";
import { buildModel } from "@/lib/engine/hourPower";

test("back-test on real rides", () => {
  const b = backtest(buildModel(loadRides()));
  console.log(JSON.stringify({ hour: b.hour, long: b.long }));
  for (const c of b.checks) console.log(c.kind, c.date.slice(0, 10), c.name, "pred", c.predicted, `(${c.low}-${c.high})`, "actual", c.actual, c.error, c.verdict);
});
