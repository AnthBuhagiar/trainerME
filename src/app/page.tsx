import { asAthlete } from "@/lib/auth/athlete";
import { ChangeList } from "@/components/ChangeList";
import { CheckIn } from "@/components/CheckIn";
import { HourRing } from "@/components/HourRing";
import { ringGoal } from "@/lib/goals/ringScale";
import { SessionCard, sessionTitle } from "@/components/SessionCard";
import { WeekStrip } from "@/components/WeekStrip";
import { weekStrip } from "@/lib/plan/weekStrip";
import { SetupCard } from "@/components/SetupCard";
import { dayLabel } from "@/lib/ui/format";
import { SyncPanel } from "@/components/SyncPanel";
import { TargetsPrompt } from "@/components/TargetsPrompt";
import { UpdateButton } from "@/components/UpdateButton";
import { WeekReviewCard } from "@/components/WeekReviewCard";
import { reviewWeekStart, weekReview } from "@/lib/plan/review";
import { formatDuration } from "@/lib/goals/eventTime";
import { isLastDayOfWeek } from "@/lib/plan/calendar";
import { loadState, nextWeekStart } from "@/lib/plan/current";
import { appUrl, callbackDomain, hasCredentials, loadTokens } from "@/lib/strava/client";
import { lastSyncedAt } from "@/lib/strava/sync";
import { ReferralReminder } from "@/components/ReferralReminder";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { referralSummary } from "@/lib/referral/referral";

export const dynamic = "force-dynamic";

const fmtDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });

async function HomeView({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const { strava: notice } = await searchParams;
  const tokens = loadTokens();
  const { adaptation, activities, targets, checkIns, today, settings, rides, history, current, summary, thisWeekStart, week, budget } = loadState();
  const missing = rides.filter((r) => !r.streams).length;
  const upcoming = budget.slots.length
    ? [...week(thisWeekStart).sessions, ...week(nextWeekStart(thisWeekStart)).sessions].filter((s) => s.date >= today)
    : [];
  const todays = upcoming.filter((s) => s.date === today);
  const thisWeekNote = budget.slots.length ? week(thisWeekStart).adaptation : undefined;
  // Weeks run Sunday to Saturday. Saturday: recap the week ending tonight, with a look at next week.
  // Sunday: last week's recap.
  const endOfWeek = isLastDayOfWeek(today);
  const recapWeekStart = reviewWeekStart(today, thisWeekStart);
  const recap = budget.slots.length && (endOfWeek || today === thisWeekStart) ? weekReview(week(recapWeekStart), activities, history) : null;
  const strip = budget.slots.length ? weekStrip(week(thisWeekStart), activities, today, sessionTitle) : null;
  const movedAway = upcoming.find((s) => s.movedFrom === today);

  const { goal: target } = ringGoal(summary?.targetHourPower, current?.hourPower ?? 0);
  const athlete = multiUser() ? currentAthlete() : null;
  const referral = athlete ? referralSummary(athlete) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      {referral?.reminder && (
        <ReferralReminder
          code={referral.code}
          shareUrl={`${appUrl()}/login?ref=${referral.code}`}
          needed={referral.reminder.needed}
          active={referral.active}
          freeUntil={referral.reminder.freeUntil}
        />
      )}
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="label">{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div>
          <h1 className="display text-[24px]">
            {tokens?.athlete?.firstname ? `Hi, ${tokens.athlete.firstname}` : "Hour Power"}
          </h1>
        </div>
        <a href="/settings" aria-label="Settings and data" title="Settings and data" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            {/* Gear outline (after Feather's "settings" icon, MIT). */}
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </a>
      </header>

      {current ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-asphalt p-5 text-chalk">
          <HourRing hourPower={current.hourPower} low={current.low} high={current.high} goal={target} />
          <div className="flex w-full justify-between text-[13px]" style={{ color: "#B9C4D0" }}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full bg-signal" />
              Now · {(current.hourPower / settings.weightKg).toFixed(2)} W/kg
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full bg-goal" />
              {summary ? `Goal ${target} W` : `Example goal ${target} W`}
            </span>
          </div>
        </section>
      ) : (
        <section className="rounded-3xl bg-asphalt p-6 text-chalk">
          <h2 className="display text-[22px]">Let’s find your hour power</h2>
          <p className="mt-2 text-[15px]" style={{ color: "#C9D3DD" }}>
            Connect Strava and sync. Rides with a power meter and heart rate give the best estimate.
          </p>
        </section>
      )}

      {!tokens && <SetupCard hasCredentials={hasCredentials()} callbackDomain={callbackDomain()} notice={notice} />}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="label">This week</h2>
            <a href="/week" className="label text-signal-ink">
              Details →
            </a>
          </div>
          {strip && <WeekStrip days={strip} />}
          <h2 className="label mt-2 px-1">{todays.length ? "Today" : "Today · rest"}</h2>
          {todays.length > 0 && <CheckIn date={today} mood={checkIns[today]} />}
          {todays.map((s) => (
            <SessionCard key={s.start} session={s} today={today} showDay={false} />
          ))}
          {!todays.length && (
            <p className="px-1 text-[15px] text-muted">
              {movedAway
                ? `Strength moved to ${dayLabel(movedAway.date, today)}: you did it yesterday. Rest today.`
                : "Rest day."}
            </p>
          )}
        </section>
      )}

      {(thisWeekNote ?? adaptation.note) && (
        <section className="rounded-2xl border border-line bg-card px-4 py-3">
          <div className="label" style={{ color: "var(--signal-ink)" }}>
            Plan adjusted
          </div>
          <p className="text-[15px] leading-snug">{thisWeekNote ?? adaptation.note}</p>
        </section>
      )}

      {targets?.proposal && <TargetsPrompt training={targets.training} proposal={targets.proposal} />}

      {summary ? (
        <a href="/plan" className="flex flex-col gap-2 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="label">Goal</h2>
            <span className="display whitespace-nowrap text-[18px]">
              {summary.weeksToGo > 1 ? `${summary.weeksToGo} weeks` : `${summary.daysToGo} days`}
            </span>
          </div>
          <div className="display text-[20px] leading-tight">{summary.goal.name}</div>
          {summary.predicted && (
            <p className="text-[15px] leading-snug">
              Today you’d finish in <strong>{formatDuration(summary.predicted.seconds)}</strong>
              {summary.needed && summary.goal.event?.targetMinutes
                ? `. ${formatDuration(summary.goal.event.targetMinutes * 60)} needs ${summary.needed.hourPower} W hour power.`
                : "."}
            </p>
          )}
          <div className="text-[13px] text-muted">
            {summary.phase
              ? `${summary.phase.label} until ${fmtDate.format(new Date(`${summary.phase.end}T00:00:00`))}`
              : `Plan starts ${fmtDate.format(new Date(`${summary.phases[0].start}T00:00:00`))}`}{" "}
            · see the plan →
          </div>
        </a>
      ) : (
        current && (
          <a href="/goal" className="flex h-14 items-center justify-center rounded-2xl border border-line bg-card text-[16px] font-semibold">
            Set a goal
          </a>
        )
      )}

      {recap && (
        <WeekReviewCard
          review={recap}
          next={endOfWeek ? week(nextWeekStart(thisWeekStart)) : undefined}
          title={endOfWeek ? "Your week" : "Last week"}
        />
      )}


      <SyncPanel connected={!!tokens} missing={missing} lastSync={lastSyncedAt()} />

      {history && history.ledger.length > 0 && <ChangeList entries={history.ledger} limit={1} />}

      <UpdateButton />
    </main>
  );
}

export default async function Home(props: Parameters<typeof HomeView>[0]) {
  return asAthlete(() => HomeView(props));
}
