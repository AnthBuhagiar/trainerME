import { asAthlete } from "@/lib/auth/athlete";
import { SendExternal } from "@/components/SendExternal";
import { OtherTraining } from "@/components/OtherTraining";
import { SessionCard } from "@/components/SessionCard";
import { kindOn, type AwayPeriod } from "@/lib/plan/away";
import { dayLabel } from "@/lib/ui/format";
import { WeekReviewCard } from "@/components/WeekReviewCard";
import { reviewWeekStart, weekReview, type WeekReview } from "@/lib/plan/review";
import { hasIntervalsKey } from "@/lib/intervals/client";
import { nextWeekStart, loadState } from "@/lib/plan/current";
import { length } from "@/lib/ui/format";
import type { WeekPlan } from "@/lib/plan/week";

export const dynamic = "force-dynamic";

function Week({ plan, title, today, away, other = [] }: { plan: WeekPlan; title: string; today: string; away: AwayPeriod[]; other?: WeekReview["other"] }) {
  const sessions = plan.sessions.filter((s) => s.date >= today);
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
      {plan.adaptation && <p className="px-1 text-[14px] font-semibold text-signal-ink">{plan.adaptation}</p>}
      {awayDates.length > 0 && (
        <p className="px-1 text-[14px] text-muted">
          Away {awayDates.map((d) => dayLabel(d, today)).join(", ")}: nothing planned.
        </p>
      )}
      <OtherTraining items={other.filter((o) => o.date <= today)} today={today} title="Also done this week" />
      {sessions.length === 0 && <p className="px-1 text-[15px] text-muted">Nothing left this week.</p>}
      {sessions.map((s) => (
        <SessionCard key={`${s.date}-${s.start}`} session={s} today={today} />
      ))}
    </section>
  );
}

function WeekPageView() {
  const state = loadState();
  const thisWeek = state.week(state.thisWeekStart);
  const next = state.week(nextWeekStart(state.thisWeekStart));
  const recapWeekStart = reviewWeekStart(state.today, state.thisWeekStart);
  const review = weekReview(state.week(recapWeekStart), state.activities, state.history);
  const isSunday = recapWeekStart === state.thisWeekStart;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[24px]">Week</h1>
        <p className="text-[15px] text-muted">
          Built around the days you’re free. A missed session is simply skipped; nothing piles up.{" "}
          <a href="/settings#days" className="font-semibold text-signal-ink">
            Change my days
          </a>
        </p>
      </header>
      <WeekReviewCard review={review} next={isSunday ? next : undefined} title={isSunday ? "Your week" : "Last week"} />
      <Week plan={thisWeek} title="This week" today={state.today} away={state.away} other={weekReview(thisWeek, state.activities, state.history).other} />
      <Week plan={next} title="Next week" today={state.today} away={state.away} />
      <SendExternal intervals={hasIntervalsKey()} />
    </main>
  );
}

export default async function WeekPage() {
  return asAthlete(() => WeekPageView());
}
