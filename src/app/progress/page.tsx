import { asAthlete } from "@/lib/auth/athlete";
import { ChangeList } from "@/components/ChangeList";
import { HourPowerChart } from "@/components/HourPowerChart";
import { backtest } from "@/lib/engine/backtest";
import { loadState } from "@/lib/plan/current";

export const dynamic = "force-dynamic";

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r)} W`;
}

function ProgressPageView() {
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
        <HourPowerChart points={history.points} goal={target} />
      </section>

      {(current.cp || current.hr) && (
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-card px-4 py-3">
            <div className="label">Best efforts</div>
            <div className="display text-[20px]">{current.cp ? `${Math.round(current.cp.hourPower)} W` : "–"}</div>
          </div>
          <div className="rounded-2xl border border-line bg-card px-4 py-3">
            <div className="label">Heart rate</div>
            <div className="display text-[20px]">{current.hr ? `${Math.round(current.hr.hourPower)} W` : "–"}</div>
            {current.hr && <div className="text-[12px] text-muted">at {current.hr.refHr} bpm</div>}
          </div>
        </section>
      )}

      {test && test.hour.n > 0 && (
        <a href="/progress/accuracy" className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-4 py-3">
          <span className="label">How accurate is it?</span>
          <span className="text-[15px] leading-snug">
            Typically within <strong>{test.hour.medianAbsError} W</strong> on your hardest hours ({test.hour.inRange} of {test.hour.n} in range).
          </span>
          <span className="text-[13px] font-semibold text-signal-ink">See the checks →</span>
        </a>
      )}

      <ChangeList entries={history.ledger} limit={3} />
    </main>
  );
}

export default async function ProgressPage() {
  return asAthlete(() => ProgressPageView());
}
