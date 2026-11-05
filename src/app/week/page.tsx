import { Watermark } from "@/components/Watermark";
import { asAthlete } from "@/lib/auth/athlete";
import { SendExternal } from "@/components/SendExternal";
import { DoneList, type DoneItem } from "@/components/DoneList";
import { SessionCard, sessionTitle } from "@/components/SessionCard";
import { kindOn, type AwayPeriod } from "@/lib/plan/away";
import { dayLabel } from "@/lib/ui/format";
import { WeekReviewCard } from "@/components/WeekReviewCard";
import { reviewWeekStart, weekReview, type WeekReview } from "@/lib/plan/review";
import { hasIntervalsKey } from "@/lib/intervals/client";
import { garminStatus } from "@/lib/garmin/client";
import { sendState, upcomingRides } from "@/lib/garmin/send";
import { nextWeekStart, loadState } from "@/lib/plan/current";
import { length } from "@/lib/ui/format";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";
import { activityIcon, missedSessions, weekStatus } from "@/lib/plan/weekStrip";
import { addDays } from "@/lib/plan/calendar";
import type { Activity } from "@/lib/types";

export const dynamic = "force-dynamic";

function Week({
  plan,
  title,
  today,
  away,
  done = [],
  missed = [],
  covered,
}: {
  plan: WeekPlan;
  title: string;
  today: string;
  away: AwayPeriod[];
  done?: DoneItem[];
  missed?: PlannedSession[];
  /** Already done (on its day or another), so not shown as still to do. */
  covered?: Set<PlannedSession>;
}) {
  // Still to do: upcoming, less any already done (today's, or ridden early); those show under Done this week.
  const sessions = plan.sessions.filter((s) => s.date >= today && !covered?.has(s));
  const awayDates = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${plan.weekStart}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)).filter(
    (d) => d >= today && kindOn(away, d) === "away",
  );
  const total = sessions.reduce((n, s) => n + s.minutes, 0);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="label">
          {title} · {plan.label}
        </h2>
        <span className="display text-[16px]">{length(total)}{sessions.length < plan.sessions.length ? " left" : ""}</span>
      </div>
      {awayDates.length > 0 && (
        <p className="px-1 text-[14px] text-muted">
          Away {awayDates.map((d) => dayLabel(d, today)).join(", ")}: nothing planned.
        </p>
      )}
      <DoneList items={done} today={today} title="Done this week" />
      {missed.map((s) => (
        <SessionCard key={`missed-${s.date}-${s.start}`} session={s} today={today} missed />
      ))}
      {sessions.length === 0 && <p className="px-1 text-[15px] text-muted">Nothing left this week.</p>}
      {sessions.map((s) => (
        <SessionCard key={`${s.date}-${s.start}`} session={s} today={today} />
      ))}
    </section>
  );
}

/** Everything on Strava this week so far, newest first; a run that stood in for an easy ride says so. */
function doneThisWeek(plan: WeekPlan, activities: Activity[], today: string, other: WeekReview["other"], doneBy: Map<Activity, PlannedSession>): DoneItem[] {
  const end = addDays(plan.weekStart, 6);
  const last = end < today ? end : today;
  return activities
    .filter((a) => a.startLocal.slice(0, 10) >= plan.weekStart && a.startLocal.slice(0, 10) <= last)
    .sort((a, b) => b.startLocal.localeCompare(a.startLocal))
    .map((a) => ({
      id: a.id,
      date: a.startLocal.slice(0, 10),
      name: a.name,
      minutes: Math.round(a.movingTime / 60),
      icon: activityIcon(a),
      note: other.find((o) => o.id === a.id)?.counted ? "counted as that day’s easy ride" : undefined,
      planned: doneBy.has(a) ? { title: sessionTitle(doneBy.get(a)!), minutes: doneBy.get(a)!.minutes } : undefined,
    }));
}

function WeekPageView() {
  const state = loadState();
  const thisWeek = state.week(state.thisWeekStart);
  const next = state.week(nextWeekStart(state.thisWeekStart));
  const recapWeekStart = reviewWeekStart(state.today, state.thisWeekStart);
  const review = weekReview(state.week(recapWeekStart), state.activities, state.history);
  const isSunday = recapWeekStart === state.thisWeekStart;
  const status = weekStatus(thisWeek, state.activities, state.today, sessionTitle);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <Watermark src="/photos/gong-finish.jpg" position="53% 50%" zoom={1.4} origin="55% 134%" />
      <header className="flex flex-col gap-1 pt-12">
        <h1 className="display text-[24px]">Week</h1>
        <p className="text-[15px] text-muted">
          <a href="/settings#days" className="font-semibold text-signal-ink dark:text-signal">
            Change my days
          </a>
        </p>
      </header>
      <WeekReviewCard review={review} next={isSunday ? next : undefined} title={isSunday ? "Your week" : "Last week"} />
      <Week plan={thisWeek} title="This week" today={state.today} away={state.away} done={doneThisWeek(thisWeek, state.activities, state.today, weekReview(thisWeek, state.activities, state.history).other, status.doneBy)}
        missed={missedSessions(thisWeek, state.activities, state.today, sessionTitle).filter((s) => s.ride && s.indoor)}
        covered={status.covered}
      />
      <Week plan={next} title="Next week" today={state.today} away={state.away} />
      <SendExternal intervals={hasIntervalsKey()} garmin={garminStatus(sendState(upcomingRides(state).sessions, state.targets?.training ?? 0))} returnTo="/week" />
    </main>
  );
}

export default async function WeekPage() {
  return asAthlete(() => WeekPageView());
}
