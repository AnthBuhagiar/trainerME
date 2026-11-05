import { Watermark } from "@/components/Watermark";
import { asAthlete } from "@/lib/auth/athlete";
import Link from "next/link";
import { AwayManager } from "@/components/AwayManager";
import { kindOn } from "@/lib/plan/away";
import { loadState, nextWeekStart } from "@/lib/plan/current";
import type { PhaseName } from "@/lib/plan/periodise";
import type { WeekPlan } from "@/lib/plan/week";
import { ActivityIcon } from "@/components/ActivityIcon";
import { sessionTitle } from "@/components/SessionCard";
import { sessionIcon } from "@/lib/plan/weekStrip";
import { dayLabel, length } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (iso: string) => fmt.format(new Date(`${iso}T00:00:00Z`));

/** Weeks this far ahead (0 = this week) show their days; later ones just the sessions, as days can still change. */
const DAYS_AHEAD = 2;

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

function PlanPageView() {
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

  const awayDays = (weekStart: string) =>
    Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${weekStart}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)).filter(
      (d) => kindOn(state.away, d) === "away",
    ).length;
  const weeks: WeekPlan[] = [];
  for (let m = state.thisWeekStart; m <= summary.goal.date; m = nextWeekStart(m)) weeks.push(state.week(m));

  const row = (w: WeekPlan, i: number) => {
    const line = weekLine(w);
    const current = w.weekStart === state.thisWeekStart;
    const eventWeek = i === weeks.length - 1;
    const withDays = i <= DAYS_AHEAD;
    const detail = [
      line.key.join(" + ") || null,
      line.long ? `long ride ${length(line.long.minutes)}${line.long.fuel ? ` at ${line.long.fuel.gramsPerHour} g/h` : ""}` : null,
      line.strength ? `${line.strength}× ${w.phase === "taper" ? "mobility" : "strength"}` : null,
      awayDays(w.weekStart) ? `away ${awayDays(w.weekStart)} ${awayDays(w.weekStart) === 1 ? "day" : "days"}` : null,
    ].filter(Boolean);
    return (
      <li key={w.weekStart}>
        <details className="group">
          <summary className="flex cursor-pointer list-none gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className={`w-1 shrink-0 rounded-full ${PHASE_COLOUR[w.phase]} ${w.recovery ? "opacity-40" : ""}`} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">
                  {day(w.weekStart)}
                  {current && <span className="text-signal-ink"> · this week</span>}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="display whitespace-nowrap text-[15px]">{length(line.total)}</span>
                  <span aria-hidden="true" className="text-[13px] text-muted transition-transform group-open:rotate-180">▾</span>
                </span>
              </div>
              <span className="label">{eventWeek ? "Event week" : w.label}</span>
              <span className="text-[13px] leading-snug text-muted">{detail.join(" · ")}</span>
              {eventWeek && (
                <span className="text-[13px] font-semibold text-signal-ink">
                  {summary.goal.name} · {day(summary.goal.date)}
                </span>
              )}
            </div>
          </summary>
          <ul className="flex flex-col gap-1 px-4 pb-3 pl-8">
            {w.sessions.length === 0 && <li className="text-[14px] text-muted">No sessions planned.</li>}
            {w.sessions.map((s) => {
              const body = (
                <>
                  <ActivityIcon icon={sessionIcon(s)} size={18} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    {withDays && <span className="label">{dayLabel(s.date, state.today)}</span>}
                    <span className="text-[15px] font-semibold leading-snug">{sessionTitle(s)}</span>
                  </span>
                  <span className="display whitespace-nowrap text-[14px]">{length(s.minutes)}</span>
                </>
              );
              return (
                <li key={`${s.date}-${s.start}`}>
                  {withDays ? (
                    <Link href={`/session/${s.date}?start=${s.start}`} className="flex items-center gap-3 py-1.5">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 py-1.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      </li>
    );
  };
  const SHOWN = 6;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <Watermark src="/photos/forest-climb.jpg" position="50% 45%" />
      <header className="flex flex-col gap-1 pt-12">
        <h1 className="display text-[24px]">Plan</h1>
        <p className="text-[15px] text-muted">
          {summary.goal.name} · {day(summary.goal.date)} · {summary.weeksToGo} weeks
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card/80 p-5 backdrop-blur-sm">
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
                {p.start === (summary.phase ?? summary.phases[0]).start && <span className="text-[13px] leading-snug">{p.focus}</span>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="label">Week by week</h2>
          <Link href="/workouts" className="text-[14px] font-semibold text-signal-ink dark:text-signal">
            All workouts →
          </Link>
        </div>
        <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
          {weeks.slice(0, SHOWN).map(row)}
        </ol>
        {weeks.length > SHOWN && (
          <details className="group">
            <summary className="cursor-pointer list-none px-1 py-2 text-[14px] font-semibold text-signal-ink">
              <span className="group-open:hidden">Show all {weeks.length} weeks to {summary.goal.name} →</span>
              <span className="hidden group-open:inline">Hide later weeks</span>
            </summary>
            <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">{weeks.slice(SHOWN).map((w, i) => row(w, i + SHOWN))}</ol>
          </details>
        )}
      </section>

      <AwayManager periods={state.away} today={state.today} />
    </main>
  );
}

export default async function PlanPage() {
  return asAthlete(() => PlanPageView());
}
