import type { WeekReview } from "@/lib/plan/review";
import { dayLabel, length } from "@/lib/ui/format";

/** Runs, rows, swims and walks from Strava: shown, and counted where they stand in for an easy ride (P18). */
export function OtherTraining({ items, today, title = "Also this week" }: { items: WeekReview["other"]; today: string; title?: string }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card px-4 py-3">
      <span className="label">{title}</span>
      <ul className="flex flex-col gap-1">
        {items.map((o, i) => (
          <li key={`${o.date}-${i}`} className="flex items-baseline justify-between gap-3 text-[14px]">
            <span>
              <span className="font-semibold">{o.name}</span> · {dayLabel(o.date, today)}
              {o.counted && <span className="block text-[13px] text-muted">Counted as that day’s easy ride</span>}
            </span>
            <span className="whitespace-nowrap text-muted">{length(o.minutes)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
