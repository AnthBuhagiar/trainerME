import { CheckIn } from "@/components/CheckIn";
import { HourRing } from "@/components/HourRing";
import { SessionCard } from "@/components/SessionCard";
import { SetupCard } from "@/components/SetupCard";
import { SyncPanel } from "@/components/SyncPanel";
import { TargetsPrompt } from "@/components/TargetsPrompt";
import { UpdateButton } from "@/components/UpdateButton";
import { dateOnly } from "@/lib/engine/dates";
import { formatDuration } from "@/lib/goals/eventTime";
import { loadState, nextMonday } from "@/lib/plan/current";
import { callbackDomain, canUpload, hasCredentials, loadTokens } from "@/lib/strava/client";
import { lastSyncedAt } from "@/lib/strava/sync";

export const dynamic = "force-dynamic";

const fmtDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r)} W`;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const { strava: notice } = await searchParams;
  const tokens = loadTokens();
  const { targets, checkIns, today, settings, rides, history, current, goal, summary, thisMonday, week, budget } = loadState();
  const missing = rides.filter((r) => !r.streams).length;
  const upcoming = budget.slots.length
    ? [...week(thisMonday).sessions, ...week(nextMonday(thisMonday)).sessions].filter((s) => s.date >= today)
    : [];
  const todays = upcoming.filter((s) => s.date === today);
  const nextUp = upcoming.find((s) => s.date > today);

  // Without a goal, show progress from the 6-month low towards +20%.
  const recent = history?.points.filter((p) => Date.parse(p.date) > Date.now() - 182 * 86_400_000) ?? [];
  const sixMonthLow = recent.length ? Math.floor(Math.min(...recent.map((p) => p.hourPower)) / 5) * 5 : 0;
  const start = goal?.startHourPower ? Math.floor(goal.startHourPower / 5) * 5 - 10 : sixMonthLow;
  const target = summary?.targetHourPower ?? (current ? Math.ceil((current.hourPower * 1.2) / 5) * 5 : 0);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex flex-col gap-0.5">
        <div className="label">{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div>
        <h1 className="display text-[24px]">
          {tokens?.athlete?.firstname ? `Hi, ${tokens.athlete.firstname}` : "Hour Power"}
        </h1>
      </header>

      {current ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-asphalt p-5 text-chalk">
          <HourRing hourPower={current.hourPower} low={current.low} high={current.high} start={start} goal={target} />
          <div className="flex w-full justify-between text-[13px]" style={{ color: "#B9C4D0" }}>
            <span className="whitespace-nowrap">{(current.hourPower / settings.weightKg).toFixed(2)} W/kg</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full bg-signal" />
              {summary ? `Goal ${target} W` : `Example goal ${target} W`}
            </span>
          </div>
          <dl className="grid w-full grid-cols-2 gap-3 text-[13px]" style={{ color: "#B9C4D0" }}>
            <div>
              <dt>From best efforts</dt>
              <dd className="display text-[18px] text-chalk">{current.cp ? `${Math.round(current.cp.hourPower)} W` : "–"}</dd>
            </div>
            <div>
              <dt>From heart rate at {current.hr?.refHr ?? "–"} bpm</dt>
              <dd className="display text-[18px] text-chalk">{current.hr ? `${Math.round(current.hr.hourPower)} W` : "–"}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="rounded-3xl bg-asphalt p-6 text-chalk">
          <h2 className="display text-[22px]">Let’s find your hour power</h2>
          <p className="mt-2 text-[15px]" style={{ color: "#C9D3DD" }}>
            Connect Strava and sync. Rides with a power meter and heart rate give the best estimate.
          </p>
        </section>
      )}

      {targets?.proposal && <TargetsPrompt training={targets.training} proposal={targets.proposal} />}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="label">{todays.length ? "Today" : "Today · rest"}</h2>
            <a href="/week" className="label text-signal-ink">
              Week →
            </a>
          </div>
          {todays.length > 0 && <CheckIn date={today} mood={checkIns[today]} />}
          {todays.map((s) => (
            <SessionCard key={s.start} session={s} today={today} />
          ))}
          {!todays.length && <p className="px-1 text-[15px] text-muted">Nothing planned today. Recovery is training too.</p>}
          {nextUp && !todays.length && <SessionCard session={nextUp} today={today} />}
        </section>
      )}

      {summary ? (
        <a href="/goal" className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="label">Goal · {summary.goal.priority}</h2>
            <span className="display text-[18px] whitespace-nowrap">
              {summary.weeksToGo > 1 ? `${summary.weeksToGo} weeks` : `${summary.daysToGo} days`}
            </span>
          </div>
          <div>
            <div className="display text-[20px] leading-tight">{summary.goal.name}</div>
            <div className="text-[14px] text-muted">
              {new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${summary.goal.date}T00:00:00`))}
              {summary.goal.event && ` · ${summary.goal.event.distanceKm} km · ${summary.goal.event.climbingM.toLocaleString("en-AU")} m`}
            </div>
          </div>
          {summary.predicted && (
            <dl className="grid grid-cols-2 gap-3 text-[13px] text-muted">
              <div>
                <dt>If it were today</dt>
                <dd className="display text-[18px] text-foreground">{formatDuration(summary.predicted.seconds)}</dd>
                <dd>at {summary.predicted.power} W average</dd>
              </div>
              {summary.needed && summary.goal.event?.targetMinutes && (
                <div>
                  <dt>For {formatDuration(summary.goal.event.targetMinutes * 60)}</dt>
                  <dd className="display text-[18px] text-foreground">{summary.needed.hourPower} W</dd>
                  <dd>hour power ({summary.needed.power} W average)</dd>
                </div>
              )}
            </dl>
          )}
          <div className="rounded-2xl bg-[#E6EAEE] px-4 py-3 text-asphalt">
            {summary.phase ? (
              <>
                <div className="text-[15px] font-semibold">{summary.phase.label} · until {fmtDate.format(new Date(`${summary.phase.end}T00:00:00`))}</div>
                <div className="text-[13px] leading-snug">{summary.phase.focus}</div>
              </>
            ) : (
              <div className="text-[15px] font-semibold">
                Plan starts Monday {fmtDate.format(new Date(`${summary.phases[0].start}T00:00:00`))} with {summary.phases[0].label.toLowerCase()}
              </div>
            )}
          </div>
          <ol className="flex gap-1" aria-label="Training phases">
            {summary.phases.map((p) => (
              <li
                key={p.start}
                title={`${p.label}: ${p.weeks} weeks`}
                style={{ flexGrow: p.weeks }}
                className={`h-2 rounded-full ${summary.phase?.start === p.start ? "bg-signal" : p.name === "flex" ? "bg-line" : "bg-muted"}`}
              />
            ))}
          </ol>
        </a>
      ) : (
        current && (
          <a href="/goal" className="flex h-14 items-center justify-center rounded-2xl border border-line bg-card text-[16px] font-semibold">
            Set a goal
          </a>
        )
      )}

      {!tokens && <SetupCard hasCredentials={hasCredentials()} callbackDomain={callbackDomain()} notice={notice} />}

      <SyncPanel connected={!!tokens} missing={missing} autoUpload={!!settings.autoUpload} canUpload={canUpload(tokens)} lastSync={lastSyncedAt()} />

      {history && history.ledger.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="label px-1">Why it changed</h2>
          {history.ledger.slice(0, 6).map((entry) => (
            <article key={entry.rideId} className="flex gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <div className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#E6EAEE] px-2.5 text-[14px] font-bold text-asphalt">
                {signed(entry.delta)}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-semibold">
                  {fmtDate.format(new Date(dateOnly(entry.date)))} · {entry.rideName}
                </div>
                {entry.reasons.map((r) => (
                  <div key={r} className="text-[13px] leading-snug text-muted">
                    {r}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
      <UpdateButton />
    </main>
  );
}
