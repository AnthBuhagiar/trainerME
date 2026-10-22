import { HourPowerChart } from "@/components/HourPowerChart";
import { backtest } from "@/lib/engine/backtest";
import { dateOnly } from "@/lib/engine/dates";
import { loadState } from "@/lib/plan/current";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r)} W`;
}

export default function ProgressPage() {
  const { model, history, current, summary, goal, settings, now } = loadState();
  if (!history || !current) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
        <h1 className="display text-[24px]">Progress</h1>
        <p className="text-[15px] text-muted">Sync your rides from Strava and your hour power history appears here.</p>
      </main>
    );
  }
  const hp = current.hourPower;
  const test = model ? backtest(model) : null;
  const sixWeeksAgo = [...history.points].reverse().find((p) => Date.parse(p.date) <= Date.parse(now) - 42 * 86_400_000);
  const target = summary?.targetHourPower;
  const stats: [string, string, string?][] = [
    ["Now", `${Math.round(hp)} W`, `${(hp / settings.weightKg).toFixed(2)} W/kg`],
    ["Last 6 weeks", sixWeeksAgo ? signed(hp - sixWeeksAgo.hourPower) : "–"],
  ];
  if (goal?.startHourPower) stats.push(["Since goal set", signed(hp - goal.startHourPower)]);
  if (target) stats.push(["To goal", target > hp ? `${Math.round(target - hp)} W` : "Reached", summary ? `${summary.weeksToGo} weeks left` : undefined]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <h1 className="display text-[24px]">Progress</h1>

      <dl className="grid grid-cols-2 gap-3">
        {stats.map(([label, value, sub]) => (
          <div key={label} className="rounded-2xl border border-line bg-card px-4 py-3">
            <dt className="label">{label}</dt>
            <dd className="display text-[24px]">{value}</dd>
            {sub && <dd className="text-[13px] text-muted">{sub}</dd>}
          </div>
        ))}
      </dl>

      <section className="rounded-3xl border border-line bg-card p-4">
        <HourPowerChart points={history.points} goal={target} goalName={goal?.name} />
      </section>

      {test && test.checks.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
          <h2 className="label">How accurate is it?</h2>
          <p className="text-[15px] leading-snug">
            {test.hour.n > 0 && (
              <>
                On your {test.hour.n} hardest hours, the estimate made beforehand was off by a typical <strong>{test.hour.medianAbsError} W</strong>, and{" "}
                {test.hour.inRange} of {test.hour.n} landed inside its likely range.{" "}
              </>
            )}
            {test.long.n > 0 && (
              <>
                On {test.long.n} {test.long.n === 1 ? "ride" : "rides"} over 4 hours, the predicted average power was off by {test.long.medianAbsError} W.
              </>
            )}
          </p>
          <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line">
            {test.checks.slice(0, 8).map((c) => (
              <li key={`${c.rideId}-${c.kind}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 text-[14px]">
                  <span className="block truncate font-semibold">
                    {fmt.format(new Date(dateOnly(c.date)))} · {c.name}
                  </span>
                  <span className="text-[13px] text-muted">
                    {c.kind === "hour" ? "Best hour" : "Long-ride average"}: predicted {c.predicted} W ({c.low}–{c.high})
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="display block text-[17px]">{c.actual} W</span>
                  <span className={`text-[12px] font-semibold ${c.verdict === "in range" ? "text-done" : "text-muted"}`}>
                    {c.verdict === "in range" ? "in range" : `${signed(c.error)}`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[13px] text-muted">
            Each check uses only rides before that day. Rides below the range may not have been flat out, so they aren&apos;t counted as misses.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="label px-1">Why it changed · every ride</h2>
        {history.ledger.map((entry) => (
          <article key={entry.rideId} className="flex gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <div className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#E6EAEE] px-2.5 text-[14px] font-bold text-asphalt">
              {signed(entry.delta)}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="text-[15px] font-semibold">
                {fmt.format(new Date(dateOnly(entry.date)))} · {entry.rideName}
              </div>
              {entry.reasons.map((r) => (
                <div key={r} className="text-[13px] leading-snug text-muted">
                  {r}
                </div>
              ))}
              <div className="text-[13px] text-muted">Now {Math.round(entry.after)} W</div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
