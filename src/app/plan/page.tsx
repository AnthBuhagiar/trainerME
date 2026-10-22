import Link from "next/link";
import { AwayManager } from "@/components/AwayManager";
import { kindOn } from "@/lib/plan/away";
import { loadState, nextMonday } from "@/lib/plan/current";
import type { PhaseName } from "@/lib/plan/periodise";
import type { WeekPlan } from "@/lib/plan/week";
import { length } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

const PHASE_COLOUR: Record<PhaseName, string> = {
  base: "bg-muted",
  build: "bg-asphalt dark:bg-chalk",
  specific: "bg-signal-ink",
  taper: "bg-signal",
  flex: "bg-line",
};

function weekLine(plan: WeekPlan) {
  const rides = plan.sessions.filter((s) => s.ride);
  const long = rides.length ? rides.reduce((a, b) => (b.minutes > a.minutes ? b : a)) : null;
  const key = rides.filter((s) => s !== long && s.ride!.workout.intensity === "hard").map((s) => s.ride!.workout.name);
  return {
    total: plan.sessions.reduce((n, s) => n + s.minutes, 0),
    key,
    long,
    strength: plan.sessions.filter((s) => s.strength).length,
  };
}

export default function PlanPage() {
  const state = loadState();
  const { summary } = state;
  if (!summary) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
        <h1 className="display text-[24px]">Plan</h1>
        <p className="text-[15px] text-muted">Set a goal and the whole block is laid out here, week by week.</p>
        <Link href="/goal" className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
          Set a goal
        </Link>
      </main>
    );
  }

  const awayDays = (monday: string) =>
    Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${monday}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)).filter(
      (d) => kindOn(state.away, d) === "away",
    ).length;
  const weeks: WeekPlan[] = [];
  for (let m = state.thisMonday; m <= summary.goal.date; m = nextMonday(m)) weeks.push(state.week(m));
  const totalWeeks = summary.phases.reduce((n, p) => n + p.weeks, 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[24px]">Plan</h1>
        <p className="text-[15px] text-muted">
          {summary.goal.name} · {day(summary.goal.date)} · {summary.weeksToGo} weeks
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <div className="flex h-3 gap-1">
          {summary.phases.map((p) => (
            <div key={p.start} style={{ flexGrow: p.weeks }} className={`rounded-full ${PHASE_COLOUR[p.name]}`} title={p.label} />
          ))}
        </div>
        <ol className="flex flex-col gap-3">
          {summary.phases.map((p) => (
            <li key={p.start} className="flex gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PHASE_COLOUR[p.name]}`} />
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold">
                  {p.label} · {p.weeks} {p.weeks === 1 ? "week" : "weeks"}
                </span>
                <span className="text-[13px] text-muted">
                  {day(p.start)} – {day(p.end)}
                  {p.recoveryWeeks.length > 0 && ` · recovery: ${p.recoveryWeeks.map(day).join(", ")}`}
                </span>
                <span className="text-[13px] leading-snug">{p.focus}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-muted">
          {totalWeeks} weeks from {day(summary.phases[0].start)}, laid out backwards from event day.
        </p>
      </section>

      <AwayManager periods={state.away} today={state.today} />

      <section className="flex flex-col gap-2">
        <h2 className="label px-1">Week by week</h2>
        <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
          {weeks.map((w, i) => {
            const line = weekLine(w);
            const current = w.monday === state.thisMonday;
            const eventWeek = i === weeks.length - 1;
            const detail = [
              line.key.join(" + ") || null,
              line.long ? `long ride ${length(line.long.minutes)}${line.long.fuel ? ` at ${line.long.fuel.gramsPerHour} g/h` : ""}` : null,
              line.strength ? `${line.strength}× ${w.phase === "taper" ? "mobility" : "strength"}` : null,
              awayDays(w.monday) ? `away ${awayDays(w.monday)} ${awayDays(w.monday) === 1 ? "day" : "days"}` : null,
            ].filter(Boolean);
            return (
              <li key={w.monday} className="flex gap-3 px-4 py-3">
                <span className={`w-1 shrink-0 rounded-full ${PHASE_COLOUR[w.phase]} ${w.recovery ? "opacity-40" : ""}`} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold">
                      {day(w.monday)}
                      {current && <span className="text-signal-ink"> · this week</span>}
                    </span>
                    <span className="display whitespace-nowrap text-[15px]">{length(line.total)}</span>
                  </div>
                  <span className="label">{eventWeek ? "Event week" : w.label}</span>
                  <span className="text-[13px] leading-snug text-muted">{detail.join(" · ")}</span>
                  {eventWeek && (
                    <span className="text-[13px] font-semibold text-signal-ink">
                      {summary.goal.name} · {day(summary.goal.date)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="px-1 text-[13px] text-muted">
          Weeks further out are a guide: targets and sessions adjust as your hour power changes.
        </p>
      </section>
    </main>
  );
}
