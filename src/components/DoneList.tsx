import Link from "next/link";
import { ActivityIcon } from "@/components/ActivityIcon";
import type { StripIcon } from "@/lib/plan/weekStrip";
import { dayLabel, length } from "@/lib/ui/format";

export interface DoneItem {
  id: string;
  date: string;
  name: string;
  minutes: number;
  icon: StripIcon;
  /** e.g. a run that counted as that day's easy ride (P18). */
  note?: string;
}

/** What was done this week, from Strava: each opens its details. */
export function DoneList({ items, today, title }: { items: DoneItem[]; today: string; title: string }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="label px-1">{title}</span>
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
        {items.map((o) => (
          <li key={o.id}>
            <Link href={`/activity/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
              <span className="text-muted">
                <ActivityIcon icon={o.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{o.name}</span>
                <span className="block text-[13px] text-muted">
                  {dayLabel(o.date, today)}
                  {o.note ? ` · ${o.note}` : ""}
                </span>
              </span>
              <span className="whitespace-nowrap text-muted">{length(o.minutes)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
