import type { WeekReview } from "@/lib/plan/review";
import type { WeekPlan } from "@/lib/plan/week";
import { length } from "@/lib/ui/format";

const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)} W`;
}

/** The weekly recap, plus a look at next week. */
export function WeekReviewCard({ review, next, title }: { review: WeekReview; next?: WeekPlan; title: string }) {
  const rides = next?.sessions.filter((s) => s.ride) ?? [];
  const long = rides.length ? rides.reduce((a, b) => (b.minutes > a.minutes ? b : a)) : null;
  const key = rides.find((s) => s !== long && s.ride!.workout.intensity === "hard");
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="label">{title}</h2>
        <span className="text-[13px] text-muted">from {fmt.format(new Date(`${review.weekStart}T00:00:00Z`))}</span>
      </div>
      <p className="text-[16px] font-semibold leading-snug">{review.headline}</p>
      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-background px-2 py-2.5">
          <dt className="label">Done</dt>
          <dd className="display text-[20px]">
            {review.done}/{review.planned}
          </dd>
        </div>
        <div className="rounded-2xl bg-background px-2 py-2.5">
          <dt className="label">Time</dt>
          <dd className="display text-[20px]">{length(review.doneMinutes)}</dd>
          <dd className="text-[12px] text-muted">of {length(review.plannedMinutes)}</dd>
        </div>
        <div className="rounded-2xl bg-background px-2 py-2.5">
          <dt className="label">Hour power</dt>
          <dd className="display text-[20px]">{review.change === null ? "–" : signed(review.change)}</dd>
        </div>
      </dl>
      {review.other.length > 0 && (
        <p className="text-[14px] leading-snug">
          Also: {review.other.map((o) => `${o.name.toLowerCase()} ${length(o.minutes)}`).join(", ")}
          {review.other.some((o) => o.counted) ? ". A run or row on an easy-ride day counts as that ride." : "."}
        </p>
      )}
      {review.best && (
        <p className="text-[14px]">
          Biggest boost: <strong>{review.best.name}</strong> ({signed(review.best.delta)}).
        </p>
      )}
      {next && (
        <p className="text-[14px] leading-snug text-muted">
          Next week: <span className="font-semibold text-foreground">{next.label}</span>
          {key ? ` · key session ${key.ride!.workout.name}` : ""}
          {long ? ` · long ride ${length(long.minutes)}` : ""}.
        </p>
      )}
    </section>
  );
}
