import { SendExternal } from "@/components/SendExternal";
import { SessionCard } from "@/components/SessionCard";
import { kindOn, type AwayPeriod } from "@/lib/plan/away";
import { dayLabel } from "@/lib/ui/format";
import { WeekReviewCard } from "@/components/WeekReviewCard";
import { reviewMonday, weekReview } from "@/lib/plan/review";
import { hasIntervalsKey } from "@/lib/intervals/client";
import { nextMonday, loadState } from "@/lib/plan/current";
import { describeSlot } from "@/lib/plan/timeBudget";
import { length } from "@/lib/ui/format";
import type { WeekPlan } from "@/lib/plan/week";

export const dynamic = "force-dynamic";

function Week({ plan, title, today, away }: { plan: WeekPlan; title: string; today: string; away: AwayPeriod[] }) {
  const sessions = plan.sessions.filter((s) => s.date >= today);
  const awayDates = Array.from({ length: 7 }, (_, i) => new Date(Date.parse(`${plan.monday}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)).filter(
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
      {sessions.length === 0 && <p className="px-1 text-[15px] text-muted">Nothing left this week.</p>}
      {sessions.map((s) => (
        <SessionCard key={`${s.date}-${s.start}`} session={s} today={today} />
      ))}
    </section>
  );
}

export default function WeekPage() {
  const state = loadState();
  const thisWeek = state.week(state.thisMonday);
  const next = state.week(nextMonday(state.thisMonday));
  const recapMonday = reviewMonday(state.today, state.thisMonday);
  const review = weekReview(state.week(recapMonday), state.activities, state.history);
  const isSunday = recapMonday === state.thisMonday;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[24px]">Week</h1>
        <p className="text-[15px] text-muted">
          Built into your usual slots. A missed session is simply skipped; nothing piles up.
        </p>
      </header>
      <WeekReviewCard review={review} next={isSunday ? next : undefined} title={isSunday ? "Your week" : "Last week"} />
      <Week plan={thisWeek} title="This week" today={state.today} away={state.away} />
      <Week plan={next} title="Next week" today={state.today} away={state.away} />
      <SendExternal intervals={hasIntervalsKey()} />
      {state.budget.slots.length > 0 && (
        <section className="flex flex-col gap-2 rounded-3xl border border-line bg-card p-5">
          <h2 className="label">Your usual week</h2>
          <ul className="flex flex-col gap-1.5 text-[15px]">
            {state.budget.slots.map((slot) => (
              <li key={`${slot.weekday}-${slot.kind}-${slot.start}-${slot.changedFrom ?? ""}`} className="flex flex-col">
                <span>{describeSlot(slot)}</span>
                {slot.reason && <span className="text-[13px] text-signal-ink">{slot.reason}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-muted">Read from your last {state.budget.weeksAnalysed} weeks of Strava.</p>
        </section>
      )}
    </main>
  );
}
